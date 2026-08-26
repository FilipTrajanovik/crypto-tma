import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rows = await sql`SELECT id, support_contact FROM settings ORDER BY id ASC LIMIT 1`;
  return NextResponse.json({ settings: rows[0] ?? { support_contact: "" } });
}

export async function PATCH(req: NextRequest) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const supportContact = String(body?.supportContact ?? "").trim();

  const existing = await sql`SELECT id FROM settings LIMIT 1`;
  if (existing.length === 0) {
    await sql`INSERT INTO settings (support_contact) VALUES (${supportContact})`;
  } else {
    await sql`UPDATE settings SET support_contact = ${supportContact}, updated_at = NOW() WHERE id = ${existing[0].id}`;
  }

  return NextResponse.json({ success: true });
}
