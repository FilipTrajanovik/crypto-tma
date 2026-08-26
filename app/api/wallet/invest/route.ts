import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [plans, investments] = await Promise.all([
    sql`SELECT id, name, description, min_amount, roi_percent, duration_days, currency FROM investment_plans WHERE is_active = true ORDER BY min_amount ASC`,
    sql`
      SELECT i.id, i.amount, i.currency, i.status, i.started_at, i.matures_at, p.name AS plan_name, p.roi_percent
      FROM investments i
      JOIN investment_plans p ON p.id = i.plan_id
      WHERE i.user_id = ${session.userId}
      ORDER BY i.started_at DESC
    `,
  ]);

  return NextResponse.json({ plans, investments });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const planId = Number(body?.planId);
  const amount = Number(body?.amount);

  if (!planId) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const planRows = await sql`SELECT id, min_amount, duration_days, currency, roi_percent FROM investment_plans WHERE id = ${planId} AND is_active = true`;
  const plan = planRows[0];
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  if (amount < Number(plan.min_amount)) {
    return NextResponse.json({ error: `Minimum investment is ${plan.min_amount} ${plan.currency}` }, { status: 400 });
  }

  const balanceRows = await sql`SELECT btc_amount, eth_amount, usd_cash FROM balances WHERE user_id = ${session.userId}`;
  const balance = balanceRows[0];
  if (!balance) {
    return NextResponse.json({ error: "Balance not found" }, { status: 404 });
  }

  const currency = plan.currency;
  const available =
    currency === "BTC" ? Number(balance.btc_amount) : currency === "ETH" ? Number(balance.eth_amount) : Number(balance.usd_cash);

  if (amount > available) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
  }

  const maturesAt = new Date(Date.now() + Number(plan.duration_days) * 24 * 60 * 60 * 1000);

  const investmentRows = await sql`
    INSERT INTO investments (user_id, plan_id, amount, currency, status, matures_at)
    VALUES (${session.userId}, ${planId}, ${amount}, ${currency}, 'active', ${maturesAt.toISOString()})
    RETURNING id, amount, currency, status, started_at, matures_at
  `;

  await sql`
    INSERT INTO transactions (user_id, type, amount, currency, status, note)
    VALUES (${session.userId}, 'invest', ${amount}, ${currency}, 'completed', ${"Invested in plan #" + planId})
  `;

  const column = currency === "BTC" ? "btc_amount" : currency === "ETH" ? "eth_amount" : "usd_cash";
  await sql.query(
    `UPDATE balances SET ${column} = ${column} - $1, updated_at = NOW() WHERE user_id = $2`,
    [amount, session.userId]
  );

  return NextResponse.json({ investment: investmentRows[0] });
}
