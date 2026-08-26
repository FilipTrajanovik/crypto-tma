import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/auth";

export async function GET() {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json(identity);
}
