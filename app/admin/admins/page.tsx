"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/app/components/AdminNav";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { PERMISSIONS } from "@/lib/permissions";
import { ChevronDown, ScrollText, Search, UserPlus } from "lucide-react";

type AdminRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  is_admin: boolean;
  is_super_admin: boolean;
  claimed_users: number;
  permissions: string[];
};

type SearchUser = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  phone: string | null;
};

const nameOf = (u: { first_name: string | null; last_name: string | null; username: string | null }, fallback: string) =>
  [u.first_name, u.last_name].filter(Boolean).join(" ") || (u.username ? `@${u.username}` : fallback);

export default function AdminsPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [selfId, setSelfId] = useState<number | null>(null);
  const [canViewLogs, setCanViewLogs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<number, string[]>>({});
  const [open, setOpen] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<SearchUser[]>([]);

  const load = useCallback(async () => {
    const [res, who] = await Promise.all([fetch("/api/admin/admins"), fetch("/api/admin/whoami")]);
    if (res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (res.status === 403) {
      router.replace("/admin/dashboard");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setAdmins(data.admins);
      setCanManage(data.canManage === true);
      setSelfId(data.selfId ?? null);
      setDrafts({});
    } else {
      toast.add({ title: "Could not load admins", type: "error" });
    }
    if (who.ok) {
      const identity = await who.json();
      setCanViewLogs(identity.isSuperAdmin && identity.permissions?.includes("view_logs"));
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (userId: number, body: object, successTitle: string) => {
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...body }),
      });
      if (res.ok) {
        toast.add({ title: successTitle, type: "success" });
        await load();
        return true;
      }
      const data = await res.json().catch(() => ({}));
      toast.add({ title: data.error || "Something went wrong", type: "error" });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.users);
        setSearched(true);
      } else {
        toast.add({ title: "Search failed", type: "error" });
      }
    } finally {
      setSearching(false);
    }
  };

  const add = async (userId: number, role: "admin" | "super") => {
    const ok = await patch(
      userId,
      role === "super" ? { isSuperAdmin: true } : { isAdmin: true },
      role === "super" ? "Added as super admin" : "Added as admin"
    );
    if (ok) setResults((r) => r.filter((u) => u.id !== userId));
  };

  const toggle = (a: AdminRow, key: string) => {
    const current = drafts[a.id] ?? a.permissions;
    setDrafts({ ...drafts, [a.id]: current.includes(key) ? current.filter((k) => k !== key) : [...current, key] });
  };

  const linkBtn = "text-xs font-bold uppercase tracking-wide text-brand-bright hover:text-white disabled:opacity-50";

  return (
    <div className="min-h-screen bg-navy">
      <AdminNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-5 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Admins</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-prose">
              {canManage
                ? "Add admins and super admins and choose what each super admin can do. A super admin can always see every client."
                : "Only the owner or a super admin with every permission can change roles."}
            </p>
          </div>
          {canViewLogs && (
            <Link href="/admin/logs" className="shrink-0 flex items-center gap-2 text-sm text-brand-bright hover:text-white mt-1">
              <ScrollText className="w-4 h-4" /> Activity log
            </Link>
          )}
        </div>

        {canManage && (
          <section className="mt-7">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold pb-2.5 border-b border-line/70 mb-4">
              Add an admin
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runSearch();
              }}
              className="flex items-center gap-3 border-b border-line focus-within:border-brand"
            >
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any client by name, username or phone"
                aria-label="Search clients"
                className="flex-1 min-w-0 h-11 bg-transparent text-sm text-white placeholder:text-muted-foreground outline-none"
              />
              <button type="submit" disabled={searching || !query.trim()} className={linkBtn}>
                {searching ? "Searching..." : "Search"}
              </button>
            </form>

            {searched && results.length === 0 && <p className="text-sm text-muted-foreground py-4">No clients match that search.</p>}
            {results.length > 0 && (
              <ul>
                {results.map((u) => {
                  const existing = admins.find((a) => a.id === u.id);
                  return (
                    <li key={u.id} className="flex items-center gap-3 py-3 border-b border-line/60">
                      <span className="graphite-chip flex items-center justify-center w-10 h-10 rounded-full shrink-0">
                        <UserPlus className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{nameOf(u, `User #${u.id}`)}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.username ? `@${u.username}` : ""}
                          {u.username && u.phone ? " · " : ""}
                          {u.phone ?? ""}
                        </p>
                      </div>
                      {existing ? (
                        <span className="text-xs text-muted-foreground">{existing.is_super_admin ? "Already a super admin" : "Already an admin"}</span>
                      ) : u.id === selfId ? null : (
                        <div className="flex items-center gap-4 shrink-0">
                          <button disabled={busyId === u.id} onClick={() => add(u.id, "admin")} className={linkBtn}>
                            Make admin
                          </button>
                          <button
                            disabled={busyId === u.id}
                            onClick={() => add(u.id, "super")}
                            className="h-9 px-4 rounded-full bg-brand-gradient text-navy text-xs font-bold uppercase tracking-wide disabled:opacity-50"
                          >
                            Make super admin
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <section className="mt-8">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold pb-2.5 border-b border-line/70">
            Team · {admins.length}
          </p>
          {loading ? (
            <div className="space-y-3 pt-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl bg-card-navy" />
              ))}
            </div>
          ) : admins.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No admins yet.</p>
          ) : (
            <ul>
              {admins.map((a) => {
                const name = nameOf(a, `Admin #${a.id}`);
                const current = drafts[a.id] ?? a.permissions;
                const dirty = drafts[a.id] !== undefined;
                const isSelf = a.id === selfId;
                const expanded = open === a.id;
                return (
                  <li key={a.id} className="border-b border-line/60">
                    <div className="flex items-center gap-3 py-3.5">
                      <span className="bg-brand-gradient text-navy flex items-center justify-center w-11 h-11 rounded-full shrink-0 font-bold">
                        {name.replace("@", "").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">
                          {name}
                          {isSelf && <span className="text-muted-foreground font-normal"> · you</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.username ? `@${a.username} · ` : ""}
                          {a.claimed_users} client{a.claimed_users === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span
                        className={`hidden sm:inline-flex items-center h-5 px-2 text-[10px] font-semibold rounded-full border ${
                          a.is_super_admin ? "text-premium border-premium/30" : "text-brand-bright border-brand/30"
                        }`}
                      >
                        {a.is_super_admin ? "Super admin" : "Admin"}
                      </span>
                      {a.is_super_admin && (
                        <button
                          onClick={() => setOpen(expanded ? null : a.id)}
                          aria-expanded={expanded}
                          aria-label={`Permissions for ${name}`}
                          className="graphite-chip flex items-center justify-center w-9 h-9 rounded-full text-brand-bright"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>

                    {canManage && !isSelf && (
                      <div className="flex items-center gap-5 pb-3.5 pl-14">
                        <button
                          disabled={busyId === a.id}
                          onClick={() =>
                            patch(a.id, { isSuperAdmin: !a.is_super_admin }, a.is_super_admin ? "Changed to admin" : "Made a super admin")
                          }
                          className={linkBtn}
                        >
                          {a.is_super_admin ? "Change to admin" : "Make super admin"}
                        </button>
                        {!a.is_super_admin && (
                          <button
                            disabled={busyId === a.id}
                            onClick={() => patch(a.id, { isAdmin: false }, "Admin removed")}
                            className="text-xs font-bold uppercase tracking-wide text-patriot-red-bright disabled:opacity-50"
                          >
                            Remove admin
                          </button>
                        )}
                      </div>
                    )}

                    {a.is_super_admin && expanded && (
                      <div className="pb-5 pl-0 sm:pl-14">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mb-2">Permissions</p>
                        <ul className="grid sm:grid-cols-2 gap-x-8">
                          {PERMISSIONS.map((p) => {
                            const on = current.includes(p.key);
                            const editable = canManage && !isSelf;
                            return (
                              <li key={p.key}>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={on}
                                  disabled={!editable}
                                  onClick={() => toggle(a, p.key)}
                                  className="w-full flex items-start gap-3 py-2.5 text-left disabled:opacity-70"
                                >
                                  <span className={`relative mt-0.5 w-9 h-5 rounded-full shrink-0 transition-colors ${on ? "bg-brand" : "bg-[#2a3a52]"}`}>
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-foreground transition-transform ${on ? "translate-x-4" : ""}`} />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-sm text-white">{p.label}</span>
                                    <span className="block text-xs text-muted-foreground">{p.hint}</span>
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                        {canManage && !isSelf && (
                          <div className="flex items-center gap-4 mt-3">
                            <button
                              disabled={!dirty || busyId === a.id}
                              onClick={() => patch(a.id, { permissions: current }, "Permissions saved")}
                              className="h-10 px-6 rounded-xl bg-brand-gradient text-navy text-xs font-bold uppercase tracking-wide shadow-brand-glow disabled:opacity-50"
                            >
                              Save permissions
                            </button>
                            {dirty && (
                              <button
                                onClick={() =>
                                  setDrafts((d) => {
                                    const next = { ...d };
                                    delete next[a.id];
                                    return next;
                                  })
                                }
                                className="text-xs text-muted-foreground hover:text-white"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
