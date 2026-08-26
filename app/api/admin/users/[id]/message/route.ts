import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = Number(params.id);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const body = await req.json();
  const text = String(body?.text || "").trim();
  if (!text) {
    return NextResponse.json({ error: "Message text is required" }, { status: 400 });
  }

  const rows = await sql`SELECT telegram_id, assigned_admin_id FROM users WHERE id = ${userId}`;
  const target = rows[0];
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!identity.isSuperAdmin && target.assigned_admin_id !== identity.userId) {
    return NextResponse.json({ error: "You have not claimed this user" }, { status: 403 });
  }

  await sendTelegramMessage(target.telegram_id, text);

  await sql`
    INSERT INTO transactions (user_id, type, amount, currency, status, note)
    VALUES (${userId}, 'adjustment', 0, 'USD', 'completed', ${"Message sent by admin: " + text})
  `;

  return NextResponse.json({ success: true });
}
