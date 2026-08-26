import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();

  if (identity.isSuperAdmin) {
    // Full visibility over every user, fuzzy search like before.
    const rows = search
      ? await sql`
          SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.username, u.phone, u.avatar_url, u.is_active, u.created_at,
                 u.assigned_admin_id, a.first_name AS assigned_admin_first_name, a.last_name AS assigned_admin_last_name,
                 COALESCE(b.btc_amount, 0) AS btc_amount, COALESCE(b.eth_amount, 0) AS eth_amount, COALESCE(b.usd_cash, 0) AS usd_cash
          FROM users u
          LEFT JOIN balances b ON b.user_id = u.id
          LEFT JOIN users a ON a.id = u.assigned_admin_id
          WHERE u.first_name ILIKE ${"%" + search + "%"} OR u.last_name ILIKE ${"%" + search + "%"} OR u.username ILIKE ${"%" + search + "%"} OR u.phone ILIKE ${"%" + search + "%"}
          ORDER BY u.created_at DESC
        `
      : await sql`
          SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.username, u.phone, u.avatar_url, u.is_active, u.created_at,
                 u.assigned_admin_id, a.first_name AS assigned_admin_first_name, a.last_name AS assigned_admin_last_name,
                 COALESCE(b.btc_amount, 0) AS btc_amount, COALESCE(b.eth_amount, 0) AS eth_amount, COALESCE(b.usd_cash, 0) AS usd_cash
          FROM users u
          LEFT JOIN balances b ON b.user_id = u.id
          LEFT JOIN users a ON a.id = u.assigned_admin_id
          ORDER BY u.created_at DESC
        `;

    return NextResponse.json({ mode: "all", users: rows });
  }

  // Claimed (Telegram) admin: default view is only users they've claimed.
  if (!search) {
    const rows = await sql`
      SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.username, u.phone, u.avatar_url, u.is_active, u.created_at,
             COALESCE(b.btc_amount, 0) AS btc_amount, COALESCE(b.eth_amount, 0) AS eth_amount, COALESCE(b.usd_cash, 0) AS usd_cash
      FROM users u
      LEFT JOIN balances b ON b.user_id = u.id
      WHERE u.assigned_admin_id = ${identity.userId}
      ORDER BY u.created_at DESC
    `;
    return NextResponse.json({ mode: "mine", users: rows });
  }

  // Searching: only exact full-name (as shown on Telegram) or exact phone
  // matches are returned, and balances are withheld until claimed — this is
  // a lookup for claiming, not a directory browse.
  const rows = await sql`
    SELECT id, first_name, last_name, username, phone, avatar_url, assigned_admin_id
    FROM users
    WHERE lower(trim(concat_ws(' ', first_name, last_name))) = lower(trim(${search}))
       OR phone = ${search}
    LIMIT 5
  `;

  const results = rows.map((u) => ({
    ...u,
    claimStatus: !u.assigned_admin_id ? "unclaimed" : u.assigned_admin_id === identity.userId ? "mine" : "claimed_by_other",
  }));

  return NextResponse.json({ mode: "search", users: results });
}
