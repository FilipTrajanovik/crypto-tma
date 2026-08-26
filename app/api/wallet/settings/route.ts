import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rows = await sql`SELECT btc_address, eth_address FROM settings ORDER BY id ASC LIMIT 1`;
  return NextResponse.json({
    btcAddress: rows[0]?.btc_address || null,
    ethAddress: rows[0]?.eth_address || null,
  });
}
