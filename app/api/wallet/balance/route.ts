import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getPrices } from "@/lib/prices";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [userRows, balanceRows, prices] = await Promise.all([
    sql`SELECT id, first_name, last_name, username, avatar_url, phone, is_admin FROM users WHERE id = ${session.userId}`,
    sql`SELECT btc_amount, eth_amount, usd_cash, updated_at FROM balances WHERE user_id = ${session.userId}`,
    getPrices(),
  ]);

  if (userRows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const user = userRows[0];
  const balance = balanceRows[0] ?? { btc_amount: "0", eth_amount: "0", usd_cash: "0", updated_at: null };

  const btc = Number(balance.btc_amount);
  const eth = Number(balance.eth_amount);
  const usdCash = Number(balance.usd_cash);
  const btcValue = btc * prices.btc;
  const ethValue = eth * prices.eth;
  const totalValue = btcValue + ethValue + usdCash;

  return NextResponse.json({
    user: {
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      avatarUrl: user.avatar_url,
      phone: user.phone,
      isAdmin: user.is_admin === true,
    },
    balance: {
      btc,
      eth,
      usdCash,
      btcValue,
      ethValue,
      totalValue,
      updatedAt: balance.updated_at,
    },
    prices,
  });
}
