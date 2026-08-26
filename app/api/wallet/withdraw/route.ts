import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

const VALID_CURRENCIES = ["BTC", "ETH", "USD"];

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rows = await sql`
    SELECT id, amount, currency, wallet_address, status, admin_note, created_at
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
  const currency = String(body?.currency || "").toUpperCase();
  const walletAddress = String(body?.walletAddress || "").trim();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (!VALID_CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }
  if (!walletAddress) {
    return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
  }

  const balanceRows = await sql`SELECT btc_amount, eth_amount, usd_cash FROM balances WHERE user_id = ${session.userId}`;
  const balance = balanceRows[0];
  if (!balance) {
    return NextResponse.json({ error: "Balance not found" }, { status: 404 });
  }

  const available =
    currency === "BTC" ? Number(balance.btc_amount) : currency === "ETH" ? Number(balance.eth_amount) : Number(balance.usd_cash);

  if (amount > available) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO withdrawal_requests (user_id, amount, currency, wallet_address, status)
    VALUES (${session.userId}, ${amount}, ${currency}, ${walletAddress}, 'pending')
    RETURNING id, amount, currency, wallet_address, status, admin_note, created_at
  `;

  await sql`
    INSERT INTO transactions (user_id, type, amount, currency, status, note)
    VALUES (${session.userId}, 'withdrawal', ${amount}, ${currency}, 'pending', ${"Withdrawal requested to " + walletAddress})
  `;

  return NextResponse.json({ withdrawal: rows[0] });
}
