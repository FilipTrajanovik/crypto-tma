import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  if (search.length < 2) {
    return NextResponse.json({ persons: [] });
  }

  const rows = await sql`
    SELECT id, first_name, last_name, username, avatar_url
    FROM users
    WHERE (is_admin = true OR is_super_admin = true)
      AND is_active = true
      AND username IS NOT NULL AND username <> ''
      AND (first_name ILIKE ${"%" + search + "%"} OR last_name ILIKE ${"%" + search + "%"} OR concat_ws(' ', first_name, last_name) ILIKE ${"%" + search + "%"})
    ORDER BY first_name ASC
    LIMIT 20
  `;

  const persons = rows.map((r) => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    username: r.username,
    avatarUrl: r.avatar_url,
  }));

  return NextResponse.json({ persons });
}
