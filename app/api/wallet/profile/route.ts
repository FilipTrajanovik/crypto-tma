import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { firstName, lastName, phone, email, homeAddress } = body;

  if (firstName !== undefined && !String(firstName).trim()) {
    return NextResponse.json({ error: "First name cannot be empty" }, { status: 400 });
  }
  if (email !== undefined && email !== null && String(email).trim()) {
    const emailStr = String(email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
  }

  await sql`
    UPDATE users SET
      first_name = CASE WHEN ${firstName !== undefined} THEN ${firstName ?? null} ELSE first_name END,
      last_name = CASE WHEN ${lastName !== undefined} THEN ${lastName ?? null} ELSE last_name END,
      phone = CASE WHEN ${phone !== undefined} THEN ${phone ?? null} ELSE phone END,
      email = CASE WHEN ${email !== undefined} THEN ${email ?? null} ELSE email END,
      home_address = CASE WHEN ${homeAddress !== undefined} THEN ${homeAddress ?? null} ELSE home_address END
    WHERE id = ${session.userId}
  `;

  return NextResponse.json({ success: true });
}
