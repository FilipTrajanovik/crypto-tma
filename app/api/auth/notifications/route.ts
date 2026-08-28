import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await sql`UPDATE users SET notifications_allowed = true WHERE id = ${session.userId}`;

  return NextResponse.json({ success: true });
}
