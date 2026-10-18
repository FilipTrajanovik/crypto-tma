import { NextRequest, NextResponse } from "next/server";
import { getAdminIdentity, can } from "@/lib/auth";
import { listAdminLogs, listLogActors } from "@/lib/admin-log";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can(identity, "view_logs")) {
    return NextResponse.json({ error: "Super-admin access with the activity log permission is required" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const actorParam = sp.get("actor");
  const actorId = actorParam === "owner" ? "owner" : actorParam && Number(actorParam) ? Number(actorParam) : null;
  const page = Math.max(0, Number(sp.get("page")) || 0);
  const q = (sp.get("q") || "").trim().slice(0, 80);

  try {
    const [{ logs, hasMore }, actors] = await Promise.all([
      listAdminLogs({ actorId, q, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
      page === 0 ? listLogActors() : Promise.resolve(null),
    ]);
    return NextResponse.json({ logs, hasMore, actors });
  } catch (err) {
    console.error("Failed to load admin logs", err);
    return NextResponse.json({ error: "Could not load the activity log" }, { status: 500 });
  }
}
