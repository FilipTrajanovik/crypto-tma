import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = Number(params.id);
  const docId = Number(params.docId);
  if (!userId || !docId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const userRows = await sql`SELECT assigned_admin_id FROM users WHERE id = ${userId}`;
  if (userRows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!identity.isSuperAdmin && userRows[0].assigned_admin_id !== identity.userId) {
    return NextResponse.json({ error: "You have not claimed this user" }, { status: 403 });
  }

  await sql`DELETE FROM user_documents WHERE id = ${docId} AND user_id = ${userId}`;

  return NextResponse.json({ success: true });
}
