import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { documentResponse } from "@/lib/document-response";
import { verifyDocumentToken } from "@/lib/document-link";

export async function GET(req: NextRequest, { params }: { params: { docId: string } }) {
  const docId = Number(params.docId);
  if (!docId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Either the signed-in session, or a short-lived link minted for this file.
  const token = req.nextUrl.searchParams.get("t");
  let userId: number | null = null;
  if (token) {
    userId = verifyDocumentToken(token, docId)?.userId ?? null;
  } else {
    userId = (await getSession())?.userId ?? null;
  }
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rows = await sql`
    SELECT file_name, mime_type, data FROM user_documents WHERE id = ${docId} AND user_id = ${userId}
  `;
  const doc = rows[0];
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return documentResponse(doc as { file_name: string; mime_type: string; data: string }, {
    download: req.nextUrl.searchParams.get("download") === "1",
  });
}
