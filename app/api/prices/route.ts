import { NextResponse } from "next/server";
import { getPrices } from "@/lib/prices";

export async function GET() {
  const prices = await getPrices();
  return NextResponse.json(prices);
}
