import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";
import { logAdminAction } from "@/lib/admin-log";
import { ensureShopTables, parsePrice, formatPrice, escapeHtml } from "@/lib/shop";

/**
 * Actions on one order, always sent as { action, ... }:
 *  - set_price        { price }               change what this customer pays
 *  - request_payment  { currency, address }   put a BTC/ETH address on the order; the customer is notified
 *  - mark_paid
 *  - cancel
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid order id" }, { status: 400 });

  await ensureShopTables();
  const order = (
    await sql`
      SELECT o.id, o.user_id, o.product_name, o.price, o.status, u.telegram_id, u.assigned_admin_id
      FROM shop_orders o JOIN users u ON u.id = o.user_id WHERE o.id = ${id}
    `
  )[0];
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!identity.isSuperAdmin && order.assigned_admin_id !== identity.userId) {
    return NextResponse.json({ error: "You have not claimed this customer" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");
  const product = escapeHtml(order.product_name);
  const closed = order.status === "paid" || order.status === "cancelled";

  if (action === "set_price") {
    if (closed) return NextResponse.json({ error: `This order is already ${order.status}` }, { status: 400 });
    const price = parsePrice(body?.price);
    if (price === null) return NextResponse.json({ error: "Enter a valid price" }, { status: 400 });
    await sql`UPDATE shop_orders SET price = ${price}, updated_at = NOW() WHERE id = ${id}`;
    await logAdminAction(identity, "Changed a shop order price", {
      targetUserId: order.user_id,
      details: `${order.product_name}: ${formatPrice(order.price)} to ${formatPrice(price)}`,
    });
    if (order.telegram_id && Number(order.price) !== price) {
      await sendTelegramMessage(
        order.telegram_id,
        `The price of your order for ${product} is now ${formatPrice(price)}. Open the wallet app and go to Shop to see it.`
      );
    }
    return NextResponse.json({ success: true });
  }

  if (action === "request_payment") {
    if (closed) return NextResponse.json({ error: `This order is already ${order.status}` }, { status: 400 });
    const currency = String(body?.currency || "").toUpperCase();
    const address = String(body?.address || "").trim().slice(0, 200);
    if (currency !== "BTC" && currency !== "ETH") return NextResponse.json({ error: "Choose BTC or ETH" }, { status: 400 });
    if (!address || /\s/.test(address)) return NextResponse.json({ error: "Enter a valid address" }, { status: 400 });
    await sql`
      UPDATE shop_orders SET status = 'awaiting_payment', pay_currency = ${currency}, pay_address = ${address}, updated_at = NOW()
      WHERE id = ${id}
    `;
    await logAdminAction(identity, "Requested payment on a shop order", {
      targetUserId: order.user_id,
      details: `${order.product_name} (${formatPrice(order.price)}) via ${currency}`,
    });
    if (order.telegram_id) {
      await sendTelegramMessage(
        order.telegram_id,
        `Payment details are ready for your order of ${product} (${formatPrice(order.price)}). Send the payment in ${currency} to:\n<code>${escapeHtml(address)}</code>\nYou can also find this under Shop in the wallet app.`
      );
    }
    return NextResponse.json({ success: true });
  }

  if (action === "mark_paid") {
    if (order.status === "paid") return NextResponse.json({ error: "Order is already paid" }, { status: 400 });
    if (order.status === "cancelled") return NextResponse.json({ error: "Order was cancelled" }, { status: 400 });
    await sql`UPDATE shop_orders SET status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = ${id}`;
    await logAdminAction(identity, "Marked a shop order as paid", {
      targetUserId: order.user_id,
      details: `${order.product_name} (${formatPrice(order.price)})`,
    });
    if (order.telegram_id) {
      await sendTelegramMessage(order.telegram_id, `Your payment for ${product} (${formatPrice(order.price)}) has been received. Thank you!`);
    }
    return NextResponse.json({ success: true });
  }

  if (action === "cancel") {
    if (closed) return NextResponse.json({ error: `This order is already ${order.status}` }, { status: 400 });
    await sql`UPDATE shop_orders SET status = 'cancelled', updated_at = NOW() WHERE id = ${id}`;
    await logAdminAction(identity, "Cancelled a shop order", { targetUserId: order.user_id, details: order.product_name });
    if (order.telegram_id) {
      await sendTelegramMessage(order.telegram_id, `Your order for ${product} has been cancelled.`);
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
