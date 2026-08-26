import { sql } from "@/lib/db";

/**
 * Resolves the Telegram contact shown to a user for support. Priority: an
 * explicit per-user override set by an admin, then the Telegram username of
 * the admin who claimed this user, then the platform-wide default.
 */
export async function getSupportContactForUser(userId: number): Promise<string | null> {
  const [userRows, settingsRows] = await Promise.all([
    sql`
      SELECT u.support_contact, a.username AS assigned_admin_username
      FROM users u
      LEFT JOIN users a ON a.id = u.assigned_admin_id
      WHERE u.id = ${userId}
    `,
    sql`SELECT support_contact FROM settings ORDER BY id ASC LIMIT 1`,
  ]);

  return userRows[0]?.support_contact || userRows[0]?.assigned_admin_username || settingsRows[0]?.support_contact || null;
}
