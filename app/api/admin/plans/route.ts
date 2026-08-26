import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rows = await sql`SELECT id, name, description, min_amount, roi_percent, duration_days, currency, is_active FROM investment_plans ORDER BY id ASC`;
  return NextResponse.json({ plans: rows });
}

export async function POST(req: NextRequest) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, minAmount, roiPercent, durationDays, currency } = body;

  if (!name || !minAmount || !roiPercent || !durationDays || !currency) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO investment_plans (name, description, min_amount, roi_percent, duration_days, currency, is_active)
    VALUES (${name}, ${description || null}, ${minAmount}, ${roiPercent}, ${durationDays}, ${currency}, true)
    RETURNING id, name, description, min_amount, roi_percent, duration_days, currency, is_active
  `;

  return NextResponse.json({ plan: rows[0] });
}

export async function PATCH(req: NextRequest) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const id = Number(body?.id);
  if (!id) {
    return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });
  }

  const { name, description, minAmount, roiPercent, durationDays, currency, isActive } = body;

  await sql`
    UPDATE investment_plans SET
      name = COALESCE(${name ?? null}, name),
      description = COALESCE(${description ?? null}, description),
      min_amount = COALESCE(${minAmount ?? null}, min_amount),
      roi_percent = COALESCE(${roiPercent ?? null}, roi_percent),
      duration_days = COALESCE(${durationDays ?? null}, duration_days),
      currency = COALESCE(${currency ?? null}, currency),
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
    return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });
  }

  await sql`UPDATE investment_plans SET is_active = false WHERE id = ${id}`;

  return NextResponse.json({ success: true });
}
