import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession, getAdminIdentity } from "@/lib/auth";
import { ensureShopTables, hasPaidRelease } from "@/lib/shop";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) return new NextResponse("Not found", { status: 404 });

  const session = await getSession();
  const isAdmin = (await getAdminIdentity()).isAdmin;
  if (!session && !isAdmin) {
    return new NextResponse("Not authenticated", { status: 401 });
  }
  if (!isAdmin && session && !(await hasPaidRelease(session.userId))) {
    return new NextResponse("Release fee required", { status: 403 });
  }

  await ensureShopTables();
  const rows = await sql`SELECT image_mime, image_data FROM shop_products WHERE id = ${id}`;
  const row = rows[0];
  if (!row?.image_data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(Buffer.from(row.image_data, "base64"), {
    headers: {
      "Content-Type": row.image_mime || "image/jpeg",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
