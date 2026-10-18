import { sql } from "@/lib/db";
import type { FeeConfig } from "@/lib/fee-calc";

export { computeFeeAmount, CURRENCY_DECIMALS, type FeeConfig, type FeeType, type WithdrawalCurrency } from "@/lib/fee-calc";

// Withdrawal fee, configured by admins. A platform-wide default lives on the
// settings row and is copied onto every request when it is created, so later
// changes to the default never alter existing requests. An admin can still
// override the fee on a pending request.
//
// The fee is deducted from the requested amount: the balance is debited the
// full amount and the client receives amount minus fee.

let columnsReady: Promise<void> | null = null;

/** Adds the fee columns on first use so no manual migration is needed. */
export function ensureFeeColumns(): Promise<void> {
  if (!columnsReady) {
    columnsReady = (async () => {
      await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS withdrawal_fee_type TEXT`;
      await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS withdrawal_fee_value DECIMAL(18,8)`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_fee_type TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_fee_value DECIMAL(18,8)`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_payment_link TEXT`;
      await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS release_payment_link TEXT`;
      await sql`ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS fee_type TEXT`;
      await sql`ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS fee_value DECIMAL(18,8)`;
      await sql`ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(18,8) NOT NULL DEFAULT 0`;
    })().catch((err) => {
      columnsReady = null;
      throw err;
    });
  }
  return columnsReady;
}

export function parseFee(type: unknown, value: unknown): { ok: true; config: FeeConfig } | { ok: false; error: string } {
  if (type === null || type === undefined || type === "" || type === "none") {
    return { ok: true, config: { type: null, value: 0 } };
  }
  if (type !== "fixed" && type !== "percent") return { ok: false, error: "Fee type must be fixed or percent" };
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Fee must be zero or more" };
  if (type === "percent" && n >= 100) return { ok: false, error: "Percentage fee must be below 100" };
  if (n === 0) return { ok: true, config: { type: null, value: 0 } };
  return { ok: true, config: { type, value: n } };
}

/**
 * The fee that applies to a client: the one set by the admin who claimed them.
 * Only clients nobody has claimed fall back to the owner's default on the settings row.
 */
export async function getFeeConfig(userId?: number): Promise<FeeConfig> {
  await ensureFeeColumns();
  if (userId !== undefined) {
    const owner = await sql`
      SELECT u.assigned_admin_id, a.withdrawal_fee_type, a.withdrawal_fee_value
      FROM users u LEFT JOIN users a ON a.id = u.assigned_admin_id
      WHERE u.id = ${userId}
    `;
    if (owner[0]?.assigned_admin_id != null) {
      const parsed = parseFee(owner[0].withdrawal_fee_type, owner[0].withdrawal_fee_value);
      return parsed.ok ? parsed.config : { type: null, value: 0 };
    }
  }
  const rows = await sql`SELECT withdrawal_fee_type, withdrawal_fee_value FROM settings ORDER BY id ASC LIMIT 1`;
  const parsed = parseFee(rows[0]?.withdrawal_fee_type, rows[0]?.withdrawal_fee_value);
  return parsed.ok ? parsed.config : { type: null, value: 0 };
}

/** Pay Fee link for a client: their own override, then their claiming admin's; the owner's default only for unclaimed clients. */
export async function getPaymentLinkForUser(userId: number): Promise<string | null> {
  await ensureFeeColumns();
  const rows = await sql`
    SELECT u.release_payment_link, u.assigned_admin_id, a.admin_payment_link,
           (SELECT release_payment_link FROM settings ORDER BY id ASC LIMIT 1) AS default_link
    FROM users u LEFT JOIN users a ON a.id = u.assigned_admin_id
    WHERE u.id = ${userId}
  `;
  const r = rows[0];
  if (!r) return null;
  if (r.release_payment_link) return r.release_payment_link;
  return r.assigned_admin_id != null ? r.admin_payment_link || null : r.default_link || null;
}

export function validPaymentLink(value: unknown): boolean {
  try {
    const u = new URL(String(value));
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
