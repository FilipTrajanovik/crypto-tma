import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { docId: string } }) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const docId = Number(params.docId);
  if (!docId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const rows = await sql`
    SELECT d.file_name, d.mime_type, d.data, u.assigned_admin_id
    FROM user_documents d JOIN users u ON u.id = d.user_id
    WHERE d.id = ${docId}
  `;
  const doc = rows[0];
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!identity.isSuperAdmin && doc.assigned_admin_id !== identity.userId) {
    return NextResponse.json({ error: "You have not claimed this user" }, { status: 403 });
  }

  const buffer = Buffer.from(doc.data, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": doc.mime_type,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.file_name)}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
