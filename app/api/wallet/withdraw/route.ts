import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rows = await sql`
    SELECT id, amount, currency, status, admin_note, created_at
    FROM withdrawal_requests
    WHERE user_id = ${session.userId}
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ withdrawals: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const amount = Number(body?.amount);

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const userRows = await sql`SELECT release_paid FROM users WHERE id = ${session.userId}`;
  if (userRows[0]?.release_paid !== true) {
    return NextResponse.json({ error: "Withdrawals unlock once your release fee is paid" }, { status: 403 });
  }

  const balanceRows = await sql`SELECT usd_cash FROM balances WHERE user_id = ${session.userId}`;
  const balance = balanceRows[0];
  if (!balance) {
    return NextResponse.json({ error: "Balance not found" }, { status: 404 });
  }

  if (amount > Number(balance.usd_cash)) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO withdrawal_requests (user_id, amount, currency, status)
    VALUES (${session.userId}, ${amount}, 'USD', 'pending')
    RETURNING id, amount, currency, status, admin_note, created_at
  `;

  await sql`
    INSERT INTO transactions (user_id, type, amount, currency, status, note)
    VALUES (${session.userId}, 'withdrawal', ${amount}, 'USD', 'pending', 'Withdrawal requested')
  `;

  return NextResponse.json({ withdrawal: rows[0] });
}
