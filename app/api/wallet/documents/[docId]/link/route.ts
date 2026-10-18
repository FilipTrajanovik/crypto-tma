import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createDocumentToken } from "@/lib/document-link";

export const dynamic = "force-dynamic";

// Mints a 5-minute link to one of the signed-in user's own documents.
export async function GET(req: NextRequest, { params }: { params: { docId: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const docId = Number(params.docId);
  if (!docId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const rows = await sql`SELECT id FROM user_documents WHERE id = ${docId} AND user_id = ${session.userId}`;
  if (!rows[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = createDocumentToken(docId, session.userId);
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const base = `${proto}://${host}/api/wallet/documents/${docId}/file?t=${encodeURIComponent(token)}`;

  return NextResponse.json({ viewUrl: base, downloadUrl: `${base}&download=1` });
}
