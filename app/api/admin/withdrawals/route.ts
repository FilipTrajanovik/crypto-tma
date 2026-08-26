import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";

export async function GET(req: NextRequest) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const statusFilter = status && status !== "all" ? status : null;

  const rows = identity.isSuperAdmin
    ? statusFilter
      ? await sql`
          SELECT w.id, w.user_id, w.amount, w.currency, w.wallet_address, w.status, w.admin_note, w.created_at,
                 u.first_name, u.last_name, u.username, u.telegram_id
          FROM withdrawal_requests w
          JOIN users u ON u.id = w.user_id
          WHERE w.status = ${statusFilter}
          ORDER BY w.created_at DESC
        `
      : await sql`
          SELECT w.id, w.user_id, w.amount, w.currency, w.wallet_address, w.status, w.admin_note, w.created_at,
                 u.first_name, u.last_name, u.username, u.telegram_id
          FROM withdrawal_requests w
          JOIN users u ON u.id = w.user_id
          ORDER BY w.created_at DESC
        `
    : statusFilter
      ? await sql`
          SELECT w.id, w.user_id, w.amount, w.currency, w.wallet_address, w.status, w.admin_note, w.created_at,
                 u.first_name, u.last_name, u.username, u.telegram_id
          FROM withdrawal_requests w
          JOIN users u ON u.id = w.user_id
          WHERE w.status = ${statusFilter} AND u.assigned_admin_id = ${identity.userId}
          ORDER BY w.created_at DESC
        `
      : await sql`
          SELECT w.id, w.user_id, w.amount, w.currency, w.wallet_address, w.status, w.admin_note, w.created_at,
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

  if (!id || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const rows = await sql`
    SELECT w.id, w.user_id, w.amount, w.currency, w.status, u.telegram_id, u.assigned_admin_id
    FROM withdrawal_requests w
    JOIN users u ON u.id = w.user_id
    WHERE w.id = ${id}
  `;
  const withdrawal = rows[0];
  if (!withdrawal) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  }
  if (!identity.isSuperAdmin && withdrawal.assigned_admin_id !== identity.userId) {
    return NextResponse.json({ error: "You have not claimed this user" }, { status: 403 });
  }
  if (withdrawal.status !== "pending") {
    return NextResponse.json({ error: "Withdrawal already processed" }, { status: 400 });
  }

  await sql`UPDATE withdrawal_requests SET status = ${status}, admin_note = ${adminNote} WHERE id = ${id}`;

  if (status === "approved") {
    const column = withdrawal.currency === "BTC" ? "btc_amount" : withdrawal.currency === "ETH" ? "eth_amount" : "usd_cash";
    await sql.query(
      `UPDATE balances SET ${column} = ${column} - $1, updated_at = NOW() WHERE user_id = $2`,
      [Number(withdrawal.amount), withdrawal.user_id]
    );
    await sql`
      INSERT INTO transactions (user_id, type, amount, currency, status, note)
      VALUES (${withdrawal.user_id}, 'withdrawal', ${withdrawal.amount}, ${withdrawal.currency}, 'completed', ${adminNote || "Withdrawal approved"})
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
        ? `Your withdrawal of ${withdrawal.amount} ${withdrawal.currency} has been approved.${adminNote ? ` Note: ${adminNote}` : ""}`
        : `Your withdrawal of ${withdrawal.amount} ${withdrawal.currency} has been rejected.${adminNote ? ` Note: ${adminNote}` : ""}`;
    await sendTelegramMessage(withdrawal.telegram_id, message);
  }

  return NextResponse.json({ success: true });
}
