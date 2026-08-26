import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const rows = status && status !== "all"
    ? await sql`
        SELECT w.id, w.user_id, w.amount, w.currency, w.wallet_address, w.status, w.admin_note, w.created_at,
               u.first_name, u.last_name, u.username, u.telegram_id
        FROM withdrawal_requests w
        JOIN users u ON u.id = w.user_id
        WHERE w.status = ${status}
        ORDER BY w.created_at DESC
      `
    : await sql`
        SELECT w.id, w.user_id, w.amount, w.currency, w.wallet_address, w.status, w.admin_note, w.created_at,
               u.first_name, u.last_name, u.username, u.telegram_id
        FROM withdrawal_requests w
        JOIN users u ON u.id = w.user_id
        ORDER BY w.created_at DESC
      `;

  return NextResponse.json({ withdrawals: rows });
}

export async function PATCH(req: NextRequest) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const id = Number(body?.id);
  const status = String(body?.status || "");
  const adminNote = body?.adminNote ? String(body.adminNote) : null;

  if (!id || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const rows = await sql`SELECT id, user_id, amount, currency, status FROM withdrawal_requests WHERE id = ${id}`;
  const withdrawal = rows[0];
  if (!withdrawal) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
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

  return NextResponse.json({ success: true });
}
