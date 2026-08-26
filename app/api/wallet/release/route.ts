import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [conditions, userRows, settingsRows] = await Promise.all([
    sql`SELECT id, title, description, fee_amount, fee_currency FROM release_conditions WHERE is_active = true ORDER BY id ASC`,
    sql`
      SELECT u.support_contact, a.username AS assigned_admin_username
      FROM users u
      LEFT JOIN users a ON a.id = u.assigned_admin_id
      WHERE u.id = ${session.userId}
    `,
    sql`SELECT support_contact FROM settings ORDER BY id ASC LIMIT 1`,
  ]);

  // Priority: an explicit per-user override set by an admin, then the
  // Telegram username of the admin who claimed this user, then the global
  // fallback configured in admin settings.
  const supportContact =
    userRows[0]?.support_contact || userRows[0]?.assigned_admin_username || settingsRows[0]?.support_contact || null;

  return NextResponse.json({ conditions, supportContact });
}
