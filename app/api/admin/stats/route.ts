import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity } from "@/lib/auth";

export async function GET() {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (identity.isSuperAdmin) {
    const [userCount, totals, pendingWithdrawals] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM users`,
      sql`SELECT COALESCE(SUM(btc_amount), 0) AS btc, COALESCE(SUM(eth_amount), 0) AS eth, COALESCE(SUM(usd_cash), 0) AS usd FROM balances`,
      sql`SELECT COUNT(*)::int AS count FROM withdrawal_requests WHERE status = 'pending'`,
    ]);

    return NextResponse.json({
      totalUsers: userCount[0].count,
      totalBtc: Number(totals[0].btc),
      totalEth: Number(totals[0].eth),
      totalUsdCash: Number(totals[0].usd),
      pendingWithdrawals: pendingWithdrawals[0].count,
    });
  }

  const [userCount, pendingWithdrawals] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM users WHERE assigned_admin_id = ${identity.userId}`,
    sql`
      SELECT COUNT(*)::int AS count FROM withdrawal_requests w
      JOIN users u ON u.id = w.user_id
      WHERE w.status = 'pending' AND u.assigned_admin_id = ${identity.userId}
    `,
  ]);

  return NextResponse.json({
    myUsers: userCount[0].count,
    pendingWithdrawals: pendingWithdrawals[0].count,
  });
}
