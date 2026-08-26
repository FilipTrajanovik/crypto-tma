import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rows = await sql`SELECT id, title, description, fee_amount, fee_currency, is_active FROM release_conditions ORDER BY id ASC`;
  return NextResponse.json({ conditions: rows });
}

export async function POST(req: NextRequest) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, feeAmount, feeCurrency } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO release_conditions (title, description, fee_amount, fee_currency, is_active)
    VALUES (${title}, ${description || null}, ${feeAmount ?? 0}, ${feeCurrency || "USD"}, true)
    RETURNING id, title, description, fee_amount, fee_currency, is_active
  `;

  return NextResponse.json({ condition: rows[0] });
}

export async function PATCH(req: NextRequest) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const id = Number(body?.id);
  if (!id) {
    return NextResponse.json({ error: "Invalid condition id" }, { status: 400 });
  }

  const { title, description, feeAmount, feeCurrency, isActive } = body;

  await sql`
    UPDATE release_conditions SET
      title = COALESCE(${title ?? null}, title),
      description = COALESCE(${description ?? null}, description),
      fee_amount = COALESCE(${feeAmount ?? null}, fee_amount),
      fee_currency = COALESCE(${feeCurrency ?? null}, fee_currency),
      is_active = COALESCE(${isActive ?? null}, is_active)
    WHERE id = ${id}
  `;

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Invalid condition id" }, { status: 400 });
  }

  await sql`UPDATE release_conditions SET is_active = false WHERE id = ${id}`;

  return NextResponse.json({ success: true });
}
