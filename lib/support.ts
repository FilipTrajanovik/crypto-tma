import { sql } from "@/lib/db";

/**
 * Resolves the Telegram contact shown to a user for support. Priority: an
 * explicit per-user override set by an admin, then the Telegram username of
 * the admin who claimed this user. Unclaimed users get no contact at all —
 * the "Contact Support" button stays inert until an admin claims them.
 */
export async function getSupportContactForUser(userId: number): Promise<string | null> {
  const rows = await sql`
    SELECT u.support_contact, a.username AS assigned_admin_username
    FROM users u
    LEFT JOIN users a ON a.id = u.assigned_admin_id
    WHERE u.id = ${userId}
  `;

  return rows[0]?.support_contact || rows[0]?.assigned_admin_username || null;
}
