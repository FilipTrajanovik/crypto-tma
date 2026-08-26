import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity } from "@/lib/auth";

export async function GET() {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!identity.isSuperAdmin) {
    return NextResponse.json({ error: "Super-admin access required" }, { status: 403 });
  }

  const rows = await sql`
    SELECT id, first_name, last_name, username
    FROM users
    WHERE is_admin = true OR is_super_admin = true
    ORDER BY first_name ASC
  `;

  return NextResponse.json({ admins: rows });
}
