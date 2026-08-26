import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();

  let rows;
  if (search) {
    const like = `%${search}%`;
    rows = await sql`
      SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.username, u.phone, u.avatar_url, u.is_active, u.created_at,
             COALESCE(b.btc_amount, 0) AS btc_amount, COALESCE(b.eth_amount, 0) AS eth_amount, COALESCE(b.usd_cash, 0) AS usd_cash
      FROM users u
      LEFT JOIN balances b ON b.user_id = u.id
      WHERE u.first_name ILIKE ${like} OR u.last_name ILIKE ${like} OR u.username ILIKE ${like} OR u.phone ILIKE ${like}
      ORDER BY u.created_at DESC
    `;
  } else {
    rows = await sql`
      SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.username, u.phone, u.avatar_url, u.is_active, u.created_at,
             COALESCE(b.btc_amount, 0) AS btc_amount, COALESCE(b.eth_amount, 0) AS eth_amount, COALESCE(b.usd_cash, 0) AS usd_cash
      FROM users u
      LEFT JOIN balances b ON b.user_id = u.id
      ORDER BY u.created_at DESC
    `;
  }

  return NextResponse.json({ users: rows });
}
