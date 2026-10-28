import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity } from "@/lib/auth";
import { ensureShopTables } from "@/lib/shop";

/** Super-admins see every order; other admins see orders of the customers they claimed. */
export async function GET() {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await ensureShopTables();
  const adminId = identity.isSuperAdmin ? null : identity.userId;
  const orders = await sql`
    SELECT o.id, o.user_id, o.product_id, o.product_name, o.list_price, o.price, o.status, o.pay_currency, o.pay_address,
           o.created_at, o.paid_at,
           u.first_name, u.last_name, u.username, u.telegram_id, u.btc_address, u.eth_address
    FROM shop_orders o
    JOIN users u ON u.id = o.user_id
    WHERE (${adminId}::int IS NULL OR u.assigned_admin_id = ${adminId})
    ORDER BY o.created_at DESC, o.id DESC
  `;

  const settings = await sql`SELECT btc_address, eth_address FROM settings LIMIT 1`;
  return NextResponse.json({
    orders,
    defaults: { btc: settings[0]?.btc_address || "", eth: settings[0]?.eth_address || "" },
    canManageProducts: identity.isSuperAdmin,
  });
}
