import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity, can } from "@/lib/auth";
import { logAdminAction } from "@/lib/admin-log";
import { ensureFeeColumns, parseFee } from "@/lib/withdrawal-fee";

export async function GET() {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await ensureFeeColumns();
  const rows = await sql`SELECT id, support_contact, btc_address, eth_address, withdrawal_fee_type, withdrawal_fee_value FROM settings ORDER BY id ASC LIMIT 1`;
  return NextResponse.json({
    settings: rows[0] ?? { support_contact: "", btc_address: "", eth_address: "", withdrawal_fee_type: null, withdrawal_fee_value: null },
  });
}

export async function PATCH(req: NextRequest) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (identity.isSuperAdmin && !can(identity, "manage_settings")) {
    return NextResponse.json({ error: "Missing permission" }, { status: 403 });
  }

  const body = await req.json();
  const supportContact = body?.supportContact !== undefined ? String(body.supportContact).trim() : undefined;
  const btcAddress = body?.btcAddress !== undefined ? String(body.btcAddress).trim() : undefined;
  const ethAddress = body?.ethAddress !== undefined ? String(body.ethAddress).trim() : undefined;

  let fee: ReturnType<typeof parseFee> | null = null;
  if (body?.withdrawalFeeType !== undefined) {
    fee = parseFee(body.withdrawalFeeType, body.withdrawalFeeValue);
    if (!fee.ok) return NextResponse.json({ error: fee.error }, { status: 400 });
    await ensureFeeColumns();
  }

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

  if (fee?.ok) {
    await sql`
      UPDATE settings SET withdrawal_fee_type = ${fee.config.type}, withdrawal_fee_value = ${fee.config.type ? fee.config.value : null}, updated_at = NOW()
      WHERE id = (SELECT id FROM settings ORDER BY id ASC LIMIT 1)
    `;
  }

  await logAdminAction(
    identity,
    "Updated platform settings",
    fee?.ok
      ? { details: fee.config.type ? `Withdrawal fee: ${fee.config.type === "percent" ? `${fee.config.value}%` : `$${fee.config.value}`}` : "Withdrawal fee: none" }
      : undefined
  );

  return NextResponse.json({ success: true });
}
