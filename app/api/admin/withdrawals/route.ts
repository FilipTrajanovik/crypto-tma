import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity, can } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";
import { logAdminAction } from "@/lib/admin-log";
import { getPrices } from "@/lib/prices";
import { ensureFeeColumns, parseFee, computeFeeAmount, type WithdrawalCurrency } from "@/lib/withdrawal-fee";

export async function GET(req: NextRequest) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await ensureFeeColumns();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const statusFilter = status && status !== "all" ? status : null;

  const rows = can(identity, "manage_withdrawals")
    ? statusFilter
      ? await sql`
          SELECT w.id, w.user_id, w.amount, w.currency, w.wallet_address, w.status, w.admin_note, w.fee_type, w.fee_value, w.fee_amount, w.created_at,
                 u.first_name, u.last_name, u.username, u.telegram_id
          FROM withdrawal_requests w
          JOIN users u ON u.id = w.user_id
          WHERE w.status = ${statusFilter}
          ORDER BY w.created_at DESC
        `
      : await sql`
          SELECT w.id, w.user_id, w.amount, w.currency, w.wallet_address, w.status, w.admin_note, w.fee_type, w.fee_value, w.fee_amount, w.created_at,
                 u.first_name, u.last_name, u.username, u.telegram_id
          FROM withdrawal_requests w
          JOIN users u ON u.id = w.user_id
          ORDER BY w.created_at DESC
        `
    : statusFilter
      ? await sql`
          SELECT w.id, w.user_id, w.amount, w.currency, w.wallet_address, w.status, w.admin_note, w.fee_type, w.fee_value, w.fee_amount, w.created_at,
                 u.first_name, u.last_name, u.username, u.telegram_id
          FROM withdrawal_requests w
          JOIN users u ON u.id = w.user_id
          WHERE w.status = ${statusFilter} AND u.assigned_admin_id = ${identity.userId}
          ORDER BY w.created_at DESC
        `
      : await sql`
          SELECT w.id, w.user_id, w.amount, w.currency, w.wallet_address, w.status, w.admin_note, w.fee_type, w.fee_value, w.fee_amount, w.created_at,
                 u.first_name, u.last_name, u.username, u.telegram_id
          FROM withdrawal_requests w
          JOIN users u ON u.id = w.user_id
          WHERE u.assigned_admin_id = ${identity.userId}
          ORDER BY w.created_at DESC
        `;

  return NextResponse.json({ withdrawals: rows });
}

export async function PATCH(req: NextRequest) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const id = Number(body?.id);
  const status = String(body?.status || "");
  const adminNote = body?.adminNote ? String(body.adminNote) : null;
  const overrideFee = body?.feeType !== undefined;

  if (!id || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const rows = await sql`
    SELECT w.id, w.user_id, w.amount, w.currency, w.status, w.fee_amount, u.telegram_id, u.assigned_admin_id
    FROM withdrawal_requests w
    JOIN users u ON u.id = w.user_id
    WHERE w.id = ${id}
  `;
  const withdrawal = rows[0];
  if (!withdrawal) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  }
  if (!can(identity, "manage_withdrawals") && withdrawal.assigned_admin_id !== identity.userId) {
    return NextResponse.json({ error: "You have not claimed this user" }, { status: 403 });
  }
  if (withdrawal.status !== "pending") {
    return NextResponse.json({ error: "Withdrawal already processed" }, { status: 400 });
  }

  // An admin can set a different fee on this request before deciding on it.
  let feeAmount = Number(withdrawal.fee_amount) || 0;
  if (overrideFee) {
    const fee = parseFee(body.feeType, body.feeValue);
    if (!fee.ok) return NextResponse.json({ error: fee.error }, { status: 400 });
    const amount = Number(withdrawal.amount);
    feeAmount = computeFeeAmount(amount, withdrawal.currency as WithdrawalCurrency, fee.config, await getPrices());
    if (feeAmount >= amount) {
      return NextResponse.json({ error: "Fee must be smaller than the withdrawal amount" }, { status: 400 });
    }
    await sql`UPDATE withdrawal_requests SET fee_type = ${fee.config.type}, fee_value = ${fee.config.type ? fee.config.value : null}, fee_amount = ${feeAmount} WHERE id = ${id}`;
  }
  const received = Number(withdrawal.amount) - feeAmount;
  const feeText = feeAmount > 0 ? ` Fee: ${feeAmount} ${withdrawal.currency}. You receive ${received} ${withdrawal.currency}.` : "";

  await sql`UPDATE withdrawal_requests SET status = ${status}, admin_note = ${adminNote} WHERE id = ${id}`;
  await logAdminAction(identity, status === "approved" ? "Approved a withdrawal" : "Rejected a withdrawal", {
    targetUserId: withdrawal.user_id,
    details: `${withdrawal.amount} ${withdrawal.currency}${feeAmount > 0 ? ` (fee ${feeAmount})` : ""}`,
  });

  if (status === "approved") {
    const column =
      withdrawal.currency === "BTC"
        ? "btc_amount"
        : withdrawal.currency === "ETH"
          ? "eth_amount"
          : withdrawal.currency === "GOLD"
            ? "gold_amount"
            : "usd_cash";
    await sql.query(
      `UPDATE balances SET ${column} = ${column} - $1, updated_at = NOW() WHERE user_id = $2`,
      [Number(withdrawal.amount), withdrawal.user_id]
    );
    await sql`
      INSERT INTO transactions (user_id, type, amount, currency, status, note)
      VALUES (${withdrawal.user_id}, 'withdrawal', ${withdrawal.amount}, ${withdrawal.currency}, 'completed', ${(adminNote || "Withdrawal approved") + (feeAmount > 0 ? ` (fee ${feeAmount} ${withdrawal.currency})` : "")})
    `;
  } else {
    await sql`
      INSERT INTO transactions (user_id, type, amount, currency, status, note)
      VALUES (${withdrawal.user_id}, 'withdrawal', ${withdrawal.amount}, ${withdrawal.currency}, 'rejected', ${adminNote || "Withdrawal rejected"})
    `;
  }

  if (withdrawal.telegram_id) {
    const message =
      status === "approved"
        ? `Your withdrawal of ${withdrawal.amount} ${withdrawal.currency} has been approved.${feeText}${adminNote ? ` Note: ${adminNote}` : ""}`
        : `Your withdrawal of ${withdrawal.amount} ${withdrawal.currency} has been rejected.${adminNote ? ` Note: ${adminNote}` : ""}`;
    await sendTelegramMessage(withdrawal.telegram_id, message);
  }

  return NextResponse.json({ success: true });
}
