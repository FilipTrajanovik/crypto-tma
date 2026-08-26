import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rows = await sql`
    SELECT id, file_name, mime_type, file_size, note, created_at
    FROM user_documents WHERE user_id = ${session.userId} ORDER BY created_at DESC
  `;

  return NextResponse.json({ documents: rows });
}
