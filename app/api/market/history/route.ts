import { NextResponse } from "next/server";
import { getMarketHistory } from "@/lib/market-history";

export const dynamic = "force-dynamic";

export async function GET() {
  const history = await getMarketHistory();
  return NextResponse.json(history);
}
