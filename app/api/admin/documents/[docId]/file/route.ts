import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity, can } from "@/lib/auth";
import { documentResponse } from "@/lib/document-response";

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
  if (!can(identity, "view_documents") && doc.assigned_admin_id !== identity.userId) {
    return NextResponse.json({ error: "You have not claimed this user" }, { status: 403 });
  }

  return documentResponse(doc as { file_name: string; mime_type: string; data: string }, {
    download: req.nextUrl.searchParams.get("download") === "1",
  });
}
