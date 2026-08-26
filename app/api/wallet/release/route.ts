import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rows = await sql`SELECT id, title, description, fee_amount, fee_currency FROM release_conditions WHERE is_active = true ORDER BY id ASC`;
  return NextResponse.json({ conditions: rows });
}
