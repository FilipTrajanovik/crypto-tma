import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity } from "@/lib/auth";
import { ensureShopTables, parsePrice, formatPrice, MAX_IMAGE_BYTES, IMAGE_TYPES } from "@/lib/shop";
import { logAdminAction } from "@/lib/admin-log";

async function requireSuperAdmin() {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) } as const;
  if (!identity.isSuperAdmin) {
    return { error: NextResponse.json({ error: "Only super admins can manage products" }, { status: 403 }) } as const;
  }
  return { identity } as const;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });

  await ensureShopTables();
  const existing = (await sql`SELECT id FROM shop_products WHERE id = ${id}`)[0];
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const form = await req.formData();

  // Quick visibility toggle: hides a product from customers without deleting it.
  if (form.has("isActive") && !form.has("name")) {
    await sql`UPDATE shop_products SET is_active = ${form.get("isActive") === "1"} WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  }

  const name = String(form.get("name") || "").trim().slice(0, 120);
  const description = String(form.get("description") || "").trim().slice(0, 2000);
  const price = parsePrice(form.get("price"));
  const file = form.get("image");
  const removeImage = form.get("removeImage") === "1";

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (price === null) return NextResponse.json({ error: "Enter a valid price" }, { status: 400 });

  const hasNewImage = file instanceof File && file.size > 0;
  if (hasNewImage) {
    if (!IMAGE_TYPES.includes(file.type)) return NextResponse.json({ error: "Photo must be a PNG, JPG, WEBP or GIF" }, { status: 400 });
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Photo is too large (max 3MB)" }, { status: 400 });
  }

  await sql`UPDATE shop_products SET name = ${name}, description = ${description || null}, price = ${price} WHERE id = ${id}`;

  if (hasNewImage) {
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    await sql`UPDATE shop_products SET image_mime = ${file.type}, image_data = ${data} WHERE id = ${id}`;
  } else if (removeImage) {
    await sql`UPDATE shop_products SET image_mime = NULL, image_data = NULL WHERE id = ${id}`;
  }

  await logAdminAction(auth.identity, "Edited a shop product", { details: `${name} (${formatPrice(price)})` });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });

  await ensureShopTables();
  const existing = (await sql`SELECT name FROM shop_products WHERE id = ${id}`)[0];
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // Orders keep their own copy of the product name and price, so they survive this.
  await sql`DELETE FROM shop_products WHERE id = ${id}`;
  await logAdminAction(auth.identity, "Deleted a shop product", { details: existing.name });
  return NextResponse.json({ success: true });
}
