import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity } from "@/lib/auth";
import { ensureShopTables, parsePrice, formatPrice, MAX_IMAGE_BYTES, IMAGE_TYPES } from "@/lib/shop";
import { logAdminAction } from "@/lib/admin-log";

/** Products are managed by super-admins only. */
export async function GET() {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!identity.isSuperAdmin) return NextResponse.json({ error: "Only super admins can manage products" }, { status: 403 });

  await ensureShopTables();
  const products = await sql`
    SELECT id, name, description, price, is_active, (image_data IS NOT NULL) AS has_image, created_at
    FROM shop_products ORDER BY created_at DESC, id DESC
  `;
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!identity.isSuperAdmin) return NextResponse.json({ error: "Only super admins can manage products" }, { status: 403 });

  const form = await req.formData();
  const name = String(form.get("name") || "").trim().slice(0, 120);
  const description = String(form.get("description") || "").trim().slice(0, 2000);
  const price = parsePrice(form.get("price"));
  const file = form.get("image");

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (price === null) return NextResponse.json({ error: "Enter a valid price" }, { status: 400 });

  let imageMime: string | null = null;
  let imageData: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!IMAGE_TYPES.includes(file.type)) return NextResponse.json({ error: "Photo must be a PNG, JPG, WEBP or GIF" }, { status: 400 });
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Photo is too large (max 3MB)" }, { status: 400 });
    imageMime = file.type;
    imageData = Buffer.from(await file.arrayBuffer()).toString("base64");
  }

  await ensureShopTables();
  const rows = await sql`
    INSERT INTO shop_products (name, description, price, image_mime, image_data)
    VALUES (${name}, ${description || null}, ${price}, ${imageMime}, ${imageData})
    RETURNING id
  `;
  await logAdminAction(identity, "Added a shop product", { details: `${name} (${formatPrice(price)})` });

  return NextResponse.json({ id: rows[0].id });
}
