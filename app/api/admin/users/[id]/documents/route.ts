import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB

async function assertClaimed(identity: { isSuperAdmin: boolean; userId: number | null }, userId: number) {
  const rows = await sql`SELECT telegram_id, assigned_admin_id FROM users WHERE id = ${userId}`;
  const target = rows[0];
  if (!target) return { error: "User not found", status: 404 } as const;
  if (!identity.isSuperAdmin && target.assigned_admin_id !== identity.userId) {
    return { error: "You have not claimed this user", status: 403 } as const;
  }
  return { target } as const;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = Number(params.id);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const check = await assertClaimed(identity, userId);
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const rows = await sql`
    SELECT id, file_name, mime_type, file_size, note, created_at
    FROM user_documents WHERE user_id = ${userId} ORDER BY created_at DESC
  `;

  return NextResponse.json({ documents: rows });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = Number(params.id);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const check = await assertClaimed(identity, userId);
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const form = await req.formData();
  const file = form.get("file");
  const note = String(form.get("note") || "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (max 8MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  await sql`
    INSERT INTO user_documents (user_id, uploaded_by_admin_id, file_name, mime_type, file_size, data, note)
    VALUES (${userId}, ${identity.userId}, ${file.name}, ${file.type || "application/octet-stream"}, ${file.size}, ${base64}, ${note || null})
  `;

  const telegramId = check.target.telegram_id;
  if (telegramId) {
    await sendTelegramMessage(
      telegramId,
      `A new document (${file.name}) has been uploaded to your account. Open the wallet app and go to Documents to view it.`
    );
  }

  return NextResponse.json({ success: true });
}
