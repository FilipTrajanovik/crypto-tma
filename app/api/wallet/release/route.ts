import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSupportContactForUser } from "@/lib/support";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [conditions, supportContact] = await Promise.all([
    sql`SELECT id, title, description, fee_amount, fee_currency FROM release_conditions WHERE is_active = true ORDER BY id ASC`,
    getSupportContactForUser(session.userId),
  ]);

  return NextResponse.json({ conditions, supportContact });
}
