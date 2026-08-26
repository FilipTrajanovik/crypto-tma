import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ["user_id = $1"];
  const params: (string | number)[] = [session.userId];

  if (type && type !== "all") {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }
  if (status && status !== "all") {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const whereClause = conditions.join(" AND ");

  params.push(pageSize);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const rows = await sql.query(
    `SELECT id, type, amount, currency, status, note, created_at FROM transactions WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  const countParams = params.slice(0, params.length - 2);
  const countRows = await sql.query(
    `SELECT COUNT(*)::int AS total FROM transactions WHERE ${whereClause}`,
    countParams
  );

  return NextResponse.json({
    transactions: rows,
    page,
    pageSize,
    total: (countRows as unknown as { total: number }[])[0]?.total ?? 0,
  });
}
