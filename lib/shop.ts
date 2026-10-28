import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram";

// Shop: products are managed by super-admins, customers place "buy now"
// orders, and the admin handling that customer prices, requests payment and
// marks the order paid. Prices are in USD. There is no stock.

export const ORDER_STATUSES = ["pending", "awaiting_payment", "paid", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // the admin form downsizes photos first
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

let tablesReady: Promise<void> | null = null;

/** Creates the shop tables on first use so no manual migration is needed. */
export function ensureShopTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS shop_products (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          price DECIMAL(18,2) NOT NULL,
          image_mime TEXT,
          image_data TEXT, -- base64-encoded photo
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS shop_orders (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          product_id INTEGER,
          product_name TEXT NOT NULL,
          list_price DECIMAL(18,2) NOT NULL, -- product price when ordered
          price DECIMAL(18,2) NOT NULL, -- what this customer pays, admin can change it
          status TEXT NOT NULL DEFAULT 'pending', -- pending, awaiting_payment, paid, cancelled
          pay_currency TEXT, -- BTC or ETH, set when the admin requests payment
          pay_address TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          paid_at TIMESTAMP
        )
      `;
      await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS product_description TEXT`;
      await sql`CREATE INDEX IF NOT EXISTS idx_shop_orders_user_id ON shop_orders(user_id)`;
    })().catch((err) => {
      tablesReady = null;
      throw err;
    });
  }
  return tablesReady;
}

export const RELEASE_REQUIRED_MESSAGE = "You need to settle your release fee first to use the Shop.";

/** The shop is open only to customers whose release fee has been marked paid. */
export async function hasPaidRelease(userId: number): Promise<boolean> {
  const rows = await sql`SELECT release_paid FROM users WHERE id = ${userId}`;
  return rows[0]?.release_paid === true;
}

export function releaseRequiredResponse() {
  return NextResponse.json({ error: RELEASE_REQUIRED_MESSAGE, code: "release_required" }, { status: 403 });
}

export function formatPrice(value: number | string): string {
  return `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function parsePrice(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) return null;
  return Math.round(n * 100) / 100;
}

/** Tells the admin who handles this customer (or every super-admin if nobody has claimed them). */
export async function notifyAdminsOfCustomer(userId: number, message: string) {
  const rows = await sql`
    SELECT a.telegram_id AS admin_telegram_id
    FROM users u LEFT JOIN users a ON a.id = u.assigned_admin_id
    WHERE u.id = ${userId}
  `;
  if (rows[0]?.admin_telegram_id) {
    await sendTelegramMessage(rows[0].admin_telegram_id, message);
  } else {
    const superAdmins = await sql`SELECT telegram_id FROM users WHERE is_super_admin = true`;
    await Promise.all(superAdmins.map((a) => sendTelegramMessage(a.telegram_id, message)));
  }
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
