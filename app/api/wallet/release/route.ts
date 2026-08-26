import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [conditions, settingsRows] = await Promise.all([
    sql`SELECT id, title, description, fee_amount, fee_currency FROM release_conditions WHERE is_active = true ORDER BY id ASC`,
    sql`SELECT support_contact FROM settings ORDER BY id ASC LIMIT 1`,
  ]);

  return NextResponse.json({
    conditions,
    supportContact: settingsRows[0]?.support_contact || null,
  });
}
