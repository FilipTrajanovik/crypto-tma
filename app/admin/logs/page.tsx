"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/app/components/AdminNav";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { Activity, Search } from "lucide-react";

type LogRow = {
  id: number;
  actor_user_id: number | null;
  actor_name: string;
  actor_role: string;
  action: string;
  target_user_id: number | null;
  target_name: string | null;
  details: string | null;
  created_at: string;
};

type Actor = { actor_user_id: number | null; actor_name: string; actor_role: string; entries: number };

const ROLE_LABEL: Record<string, string> = { owner: "Owner", super_admin: "Super admin", admin: "Admin" };

function when(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  const rel = mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : mins < 1440 ? `${Math.round(mins / 60)} h ago` : null;
  const exact = d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  return { rel, exact };
}

export default function ActivityLogPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [actors, setActors] = useState<Actor[]>([]);
  const [actor, setActor] = useState("");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(
    async (pageNum: number, replace: boolean) => {
      const params = new URLSearchParams({ page: String(pageNum) });
      if (actor) params.set("actor", actor);
      if (term) params.set("q", term);
      const res = await fetch(`/api/admin/logs?${params}`);
      if (res.status === 401) {
        router.replace("/admin");
        return;
      }
      if (res.status === 403) {
        router.replace("/admin/dashboard");
        return;
      }
      if (!res.ok) {
        toast.add({ title: "Could not load the activity log", type: "error" });
        setLogs((l) => l ?? []);
        return;
      }
      const data = await res.json();
      setLogs((prev) => (replace || !prev ? data.logs : [...prev, ...data.logs]));
      setHasMore(data.hasMore);
      setPage(pageNum);
      if (data.actors) setActors(data.actors);
    },
    [actor, term, router]
  );

  useEffect(() => {
    setLogs(null);
    fetchPage(0, true);
  }, [fetchPage]);

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const more = async () => {
    setLoadingMore(true);
    try {
      await fetchPage(page + 1, false);
    } finally {
      setLoadingMore(false);
    }
  };

  const actorKey = (a: Actor) => (a.actor_role === "owner" ? "owner" : String(a.actor_user_id));

  return (
    <div className="min-h-screen bg-navy">
      <AdminNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-5 py-6">
        <h1 className="text-xl font-semibold tracking-tight text-white">Activity log</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-prose">
          Who did what across the admin panel, newest first. Only super admins with the activity log permission can see this.
        </p>

        <div className="flex flex-col sm:flex-row gap-x-8 gap-y-3 mt-6">
          <div className="flex-1 flex items-center gap-3 border-b border-line focus-within:border-brand">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search actions, admins or clients"
              aria-label="Search the activity log"
              className="flex-1 min-w-0 h-11 bg-transparent text-sm text-white placeholder:text-muted-foreground outline-none"
            />
          </div>
          <div className="sm:w-56">
            <label htmlFor="actor" className="sr-only">
              Filter by admin
            </label>
            <select
              id="actor"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              className="w-full h-11 bg-transparent border-0 border-b border-line text-sm text-white focus-visible:border-brand"
            >
              <option value="" className="bg-card-navy">All admins</option>
              {actors.map((a) => (
                <option key={actorKey(a)} value={actorKey(a)} className="bg-card-navy">
                  {a.actor_name} · {a.entries}
                </option>
              ))}
            </select>
          </div>
        </div>

        {logs === null ? (
          <div className="space-y-3 pt-6">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl bg-card-navy" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center border-t border-line/60 mt-5">
            <span className="graphite-chip flex items-center justify-center w-12 h-12 rounded-full">
              <Activity className="w-5 h-5" />
            </span>
            <p className="text-sm font-medium text-white">Nothing recorded yet</p>
            <p className="text-xs text-muted-foreground max-w-[260px]">
              {actor || term ? "No entries match these filters." : "Admin actions from now on will show up here."}
            </p>
          </div>
        ) : (
          <>
            <ul className="border-t border-line/60 mt-5">
              {logs.map((l) => {
                const t = when(l.created_at);
                return (
                  <li key={l.id} className="flex gap-3 py-3.5 border-b border-line/60">
                    <span className="bg-brand-gradient text-navy flex items-center justify-center w-9 h-9 rounded-full shrink-0 text-sm font-bold">
                      {l.actor_name.replace("@", "").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white break-words">
                        <span className="font-semibold">{l.actor_name}</span>{" "}
                        {l.actor_role !== "owner" && (
                          <>
                            <span className="text-muted-foreground">({ROLE_LABEL[l.actor_role] ?? l.actor_role})</span>{" "}
                          </>
                        )}
                        {l.action.charAt(0).toLowerCase() + l.action.slice(1)}
                        {l.target_name && (
                          <>
                            {" "}
                            {l.target_user_id ? (
                              <Link href={`/admin/users/${l.target_user_id}`} className="text-brand-bright hover:underline">
                                {l.target_name}
                              </Link>
                            ) : (
                              <span className="text-brand-bright">{l.target_name}</span>
                            )}
                          </>
                        )}
                      </p>
                      {l.details && <p className="text-xs text-muted-foreground mt-0.5 break-words">{l.details}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-white tabular-nums">{t.rel ?? t.exact}</p>
                      {t.rel && <p className="text-[11px] text-muted-foreground tabular-nums">{t.exact}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
            {hasMore && (
              <div className="flex justify-center pt-5">
                <button
                  onClick={more}
                  disabled={loadingMore}
                  className="h-10 px-6 rounded-full graphite-chip text-brand-bright text-xs font-bold uppercase tracking-wide disabled:opacity-60"
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
