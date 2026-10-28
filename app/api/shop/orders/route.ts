import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ensureShopTables, hasPaidRelease, releaseRequiredResponse, notifyAdminsOfCustomer, escapeHtml, formatPrice } from "@/lib/shop";
import { getSupportContactForUser } from "@/lib/support";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!(await hasPaidRelease(session.userId))) return releaseRequiredResponse();

  await ensureShopTables();
  const [orders, supportContact] = await Promise.all([
    sql`
      SELECT o.id, o.product_id, o.product_name, o.list_price, o.price, o.status, o.pay_currency, o.pay_address,
             COALESCE(o.product_description, p.description) AS description, o.created_at, o.paid_at, (p.image_data IS NOT NULL) AS has_image
      FROM shop_orders o LEFT JOIN shop_products p ON p.id = o.product_id
      WHERE o.user_id = ${session.userId} ORDER BY o.created_at DESC, o.id DESC
    `,
    getSupportContactForUser(session.userId),
  ]);

  return NextResponse.json({ orders, supportContact });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const productId = Number(body?.productId);
  if (!productId) {
    return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  }

  if (!(await hasPaidRelease(session.userId))) return releaseRequiredResponse();

  await ensureShopTables();
  const products = await sql`SELECT id, name, description, price FROM shop_products WHERE id = ${productId} AND is_active = true`;
  const product = products[0];
  if (!product) {
    return NextResponse.json({ error: "This product is no longer available" }, { status: 404 });
  }

  // A double tap should not create two orders for the same product.
  const recent = await sql`
    SELECT id FROM shop_orders
    WHERE user_id = ${session.userId} AND product_id = ${productId} AND status = 'pending'
      AND created_at > NOW() - INTERVAL '1 minute'
  `;
  if (recent.length > 0) {
    return NextResponse.json({ orderId: recent[0].id });
  }

  const rows = await sql`
    INSERT INTO shop_orders (user_id, product_id, product_name, product_description, list_price, price)
    VALUES (${session.userId}, ${product.id}, ${product.name}, ${product.description}, ${product.price}, ${product.price})
    RETURNING id
  `;

  const users = await sql`SELECT first_name, last_name, username FROM users WHERE id = ${session.userId}`;
  const u = users[0];
  const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ") || u?.username || `User #${session.userId}`;
  await notifyAdminsOfCustomer(
    session.userId,
    `New shop order: ${escapeHtml(name)} wants to buy ${escapeHtml(product.name)} (${formatPrice(product.price)}). Review it in the admin panel under Shop.`
  );

  return NextResponse.json({ orderId: rows[0].id });
}
