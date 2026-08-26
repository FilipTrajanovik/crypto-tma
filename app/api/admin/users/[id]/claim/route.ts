import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (identity.isSuperAdmin || !identity.userId) {
    return NextResponse.json({ error: "The owner account already has access to every user" }, { status: 400 });
  }

  const userId = Number(params.id);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }
  if (userId === identity.userId) {
    return NextResponse.json({ error: "You cannot claim yourself" }, { status: 400 });
  }

  const rows = await sql`SELECT id, assigned_admin_id FROM users WHERE id = ${userId}`;
  const target = rows[0];
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.assigned_admin_id && target.assigned_admin_id !== identity.userId) {
    return NextResponse.json({ error: "This user has already been claimed by another admin" }, { status: 409 });
  }

  await sql`UPDATE users SET assigned_admin_id = ${identity.userId} WHERE id = ${userId}`;

  return NextResponse.json({ success: true });
}
