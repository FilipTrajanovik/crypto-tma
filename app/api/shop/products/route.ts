import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ensureShopTables, hasPaidRelease, releaseRequiredResponse } from "@/lib/shop";
import { getSupportContactForUser } from "@/lib/support";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!(await hasPaidRelease(session.userId))) return releaseRequiredResponse();

  await ensureShopTables();
  const [products, supportContact] = await Promise.all([
    sql`
      SELECT id, name, description, price, (image_data IS NOT NULL) AS has_image
      FROM shop_products WHERE is_active = true ORDER BY created_at DESC, id DESC
    `,
    getSupportContactForUser(session.userId),
  ]);

  return NextResponse.json({ products, supportContact });
}
