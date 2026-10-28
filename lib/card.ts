import { createHmac } from "crypto";
import { sql } from "@/lib/db";
import { ensureShopTables } from "@/lib/shop";

// The wallet card details are derived from the user id, so they stay the same
// every time without needing a new column.
function secret(): string {
  const value = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("SESSION_SECRET environment variable is not set");
  return value;
}

function digits(userId: number, label: string, length: number): string {
  const hash = createHmac("sha256", secret()).update(`card:${label}:${userId}`).digest();
  let out = "";
  for (let i = 0; out.length < length; i++) out += String(hash[i % hash.length] % 10);
  return out;
}

function luhnCheckDigit(partial: string): string {
  let sum = 0;
  for (let i = partial.length - 1, double = true; i >= 0; i--, double = !double) {
    let d = Number(partial[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return String((10 - (sum % 10)) % 10);
}

export type CardDetails = { number: string; expiry: string; cvv: string };

export function getCardDetails(userId: number): CardDetails {
  const partial = "4" + digits(userId, "pan", 14);
  const number = partial + luhnCheckDigit(partial);
  const year = (new Date().getFullYear() + 4) % 100;
  const month = (Number(digits(userId, "month", 2)) % 12) + 1;
  return {
    number: number.replace(/(.{4})/g, "$1 ").trim(),
    expiry: `${String(month).padStart(2, "0")}/${String(year).padStart(2, "0")}`,
    cvv: digits(userId, "cvv", 3),
  };
}

/** True when the customer has bought a phone from the shop (a paid order whose product name mentions "phone"). */
export async function hasPurchasedPhone(userId: number): Promise<boolean> {
  await ensureShopTables();
  const rows = await sql`
    SELECT 1 FROM shop_orders WHERE user_id = ${userId} AND status = 'paid' AND product_name ILIKE '%phone%' LIMIT 1
  `;
  return rows.length > 0;
}
