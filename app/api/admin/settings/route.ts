import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rows = await sql`SELECT id, support_contact, btc_address, eth_address FROM settings ORDER BY id ASC LIMIT 1`;
  return NextResponse.json({ settings: rows[0] ?? { support_contact: "", btc_address: "", eth_address: "" } });
}

export async function PATCH(req: NextRequest) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const supportContact = body?.supportContact !== undefined ? String(body.supportContact).trim() : undefined;
  const btcAddress = body?.btcAddress !== undefined ? String(body.btcAddress).trim() : undefined;
  const ethAddress = body?.ethAddress !== undefined ? String(body.ethAddress).trim() : undefined;

  const existing = await sql`SELECT id FROM settings LIMIT 1`;
  if (existing.length === 0) {
    await sql`INSERT INTO settings (support_contact, btc_address, eth_address) VALUES (${supportContact ?? ""}, ${btcAddress ?? ""}, ${ethAddress ?? ""})`;
  } else {
    await sql`
      UPDATE settings SET
        support_contact = COALESCE(${supportContact ?? null}, support_contact),
        btc_address = COALESCE(${btcAddress ?? null}, btc_address),
        eth_address = COALESCE(${ethAddress ?? null}, eth_address),
        updated_at = NOW()
      WHERE id = ${existing[0].id}
    `;
  }

  return NextResponse.json({ success: true });
}
