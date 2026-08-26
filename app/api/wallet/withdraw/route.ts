import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";

const CURRENCIES = ["USD", "BTC", "ETH", "GOLD"] as const;
type Currency = (typeof CURRENCIES)[number];

const BALANCE_COLUMN: Record<Currency, "usd_cash" | "btc_amount" | "eth_amount" | "gold_amount"> = {
  USD: "usd_cash",
  BTC: "btc_amount",
  ETH: "eth_amount",
  GOLD: "gold_amount",
};

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
  const currency = String(body?.currency || "USD").toUpperCase() as Currency;

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (!CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }

  const userRows = await sql`
    SELECT u.release_paid, u.first_name, u.last_name, u.username, a.telegram_id AS admin_telegram_id
    FROM users u
    LEFT JOIN users a ON a.id = u.assigned_admin_id
    WHERE u.id = ${session.userId}
  `;
  if (userRows[0]?.release_paid !== true) {
    return NextResponse.json({ error: "Withdrawals unlock once your release fee is paid" }, { status: 403 });
  }

  const balanceRows = await sql`SELECT usd_cash, btc_amount, eth_amount, gold_amount FROM balances WHERE user_id = ${session.userId}`;
  const balance = balanceRows[0];
  if (!balance) {
    return NextResponse.json({ error: "Balance not found" }, { status: 404 });
  }

  const available = Number(balance[BALANCE_COLUMN[currency]]);
  if (amount > available) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO withdrawal_requests (user_id, amount, currency, status)
    VALUES (${session.userId}, ${amount}, ${currency}, 'pending')
    RETURNING id, amount, currency, status, admin_note, created_at
  `;

  await sql`
    INSERT INTO transactions (user_id, type, amount, currency, status, note)
    VALUES (${session.userId}, 'withdrawal', ${amount}, ${currency}, 'pending', 'Withdrawal requested')
  `;

  const requester = userRows[0];
  if (requester?.admin_telegram_id) {
    const name = [requester.first_name, requester.last_name].filter(Boolean).join(" ") || requester.username || `User #${session.userId}`;
    await sendTelegramMessage(
      requester.admin_telegram_id,
      `New withdrawal request: ${name} requested ${amount} ${currency}. Review it in the admin panel.`
    );
  }

  return NextResponse.json({ withdrawal: rows[0] });
}
