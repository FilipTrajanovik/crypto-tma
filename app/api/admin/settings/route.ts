import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity, can } from "@/lib/auth";
import { logAdminAction } from "@/lib/admin-log";
import { ensureFeeColumns, parseFee, validPaymentLink } from "@/lib/withdrawal-fee";

// Support contact and deposit addresses are platform-wide defaults (settings row).
// The withdrawal fee and the Pay Fee link are per admin: each admin's own values
// apply to the clients they claimed. The owner has no user row, so the owner's
// values live on the settings row and act as the fallback for everyone else.

export async function GET() {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await ensureFeeColumns();
  const rows = await sql`SELECT id, support_contact, btc_address, eth_address, withdrawal_fee_type, withdrawal_fee_value, release_payment_link FROM settings ORDER BY id ASC LIMIT 1`;
  const global = rows[0] ?? { support_contact: "", btc_address: "", eth_address: "", withdrawal_fee_type: null, withdrawal_fee_value: null, release_payment_link: null };

  let mine = {
    withdrawalFeeType: global.withdrawal_fee_type as string | null,
    withdrawalFeeValue: global.withdrawal_fee_value as string | null,
    paymentLink: global.release_payment_link as string | null,
  };
  if (identity.userId !== null) {
    const own = await sql`SELECT withdrawal_fee_type, withdrawal_fee_value, admin_payment_link FROM users WHERE id = ${identity.userId}`;
    mine = {
      withdrawalFeeType: own[0]?.withdrawal_fee_type ?? null,
      withdrawalFeeValue: own[0]?.withdrawal_fee_value ?? null,
      paymentLink: own[0]?.admin_payment_link ?? null,
    };
  }

  return NextResponse.json({
    settings: global,
    mine,
    canEditGlobal: !identity.isSuperAdmin || can(identity, "manage_settings"),
    isOwner: identity.userId === null,
  });
}

export async function PATCH(req: NextRequest) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const supportContact = body?.supportContact !== undefined ? String(body.supportContact).trim() : undefined;
  const btcAddress = body?.btcAddress !== undefined ? String(body.btcAddress).trim() : undefined;
  const ethAddress = body?.ethAddress !== undefined ? String(body.ethAddress).trim() : undefined;
  const touchesGlobal = supportContact !== undefined || btcAddress !== undefined || ethAddress !== undefined;
  if (touchesGlobal && identity.isSuperAdmin && !can(identity, "manage_settings")) {
    return NextResponse.json({ error: "Missing permission" }, { status: 403 });
  }

  let fee: ReturnType<typeof parseFee> | null = null;
  if (body?.withdrawalFeeType !== undefined) {
    fee = parseFee(body.withdrawalFeeType, body.withdrawalFeeValue);
    if (!fee.ok) return NextResponse.json({ error: fee.error }, { status: 400 });
  }

  let paymentLink: string | null | undefined = undefined;
  if (body?.paymentLink !== undefined) {
    const trimmed = String(body.paymentLink ?? "").trim();
    if (trimmed && !validPaymentLink(trimmed)) {
      return NextResponse.json({ error: "Payment link must be a valid http(s) URL" }, { status: 400 });
    }
    paymentLink = trimmed || null;
  }

  await ensureFeeColumns();

  if (touchesGlobal) {
    const existing = await sql`SELECT id FROM settings LIMIT 1`;
    if (existing.length === 0) {
      await sql`INSERT INTO settings (support_contact, btc_address, eth_address) VALUES (${supportContact ?? ""}, ${btcAddress ?? ""}, ${ethAddress ?? ""})`;
    } else {
      await sql`
        UPDATE settings SET
          support_contact = COALESCE(${supportContact ?? null}, support_contact),
          btc_address = COALESCE(${btcAddress ?? null}, btc_address),
          eth_address = COALESCE(${ethAddress ?? null}, eth_address),
          updated_at = NOW()
        WHERE id = ${existing[0].id}
      `;
    }
  }

  const feeChange = fee?.ok === true;
  if (feeChange || paymentLink !== undefined) {
    const feeType = fee?.ok ? fee.config.type : null;
    const feeValue = fee?.ok && fee.config.type ? fee.config.value : null;
    if (identity.userId !== null) {
      await sql`
        UPDATE users SET
          withdrawal_fee_type = CASE WHEN ${feeChange} THEN ${feeType} ELSE withdrawal_fee_type END,
          withdrawal_fee_value = CASE WHEN ${feeChange} THEN ${feeValue} ELSE withdrawal_fee_value END,
          admin_payment_link = CASE WHEN ${paymentLink !== undefined} THEN ${paymentLink ?? null} ELSE admin_payment_link END
        WHERE id = ${identity.userId}
      `;
    } else {
      const existing = await sql`SELECT id FROM settings LIMIT 1`;
      if (existing.length === 0) await sql`INSERT INTO settings (support_contact) VALUES ('')`;
      await sql`
        UPDATE settings SET
          withdrawal_fee_type = CASE WHEN ${feeChange} THEN ${feeType} ELSE withdrawal_fee_type END,
          withdrawal_fee_value = CASE WHEN ${feeChange} THEN ${feeValue} ELSE withdrawal_fee_value END,
          release_payment_link = CASE WHEN ${paymentLink !== undefined} THEN ${paymentLink ?? null} ELSE release_payment_link END,
          updated_at = NOW()
        WHERE id = (SELECT id FROM settings ORDER BY id ASC LIMIT 1)
      `;
    }
  }

  const details: string[] = [];
  if (fee?.ok) {
    details.push(`Withdrawal fee: ${fee.config.type ? (fee.config.type === "percent" ? `${fee.config.value}%` : `$${fee.config.value}`) : "none"}`);
  }
  if (paymentLink !== undefined) details.push(paymentLink ? "Payment link set" : "Payment link removed");
  await logAdminAction(identity, touchesGlobal ? "Updated platform settings" : "Updated own settings", details.length ? { details: details.join("; ") } : undefined);

  return NextResponse.json({ success: true });
}
