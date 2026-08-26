"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/app/components/AdminNav";

type Stats = {
  totalUsers: number;
  totalBtc: number;
  totalEth: number;
  totalUsdCash: number;
  pendingWithdrawals: number;
};

type FullUser = {
  id: number;
  telegram_id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  btc_amount: string;
  eth_amount: string;
  usd_cash: string;
  assigned_admin_id: number | null;
  assigned_admin_first_name?: string | null;
  assigned_admin_last_name?: string | null;
};

type SearchUser = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  claimStatus: "unclaimed" | "mine" | "claimed_by_other";
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<FullUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Claimed-admin search state
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const loadFullUsers = useCallback(async (q: string) => {
    const params = q ? `?search=${encodeURIComponent(q)}` : "";
    const res = await fetch(`/api/admin/users${params}`);
    if (res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
  }, [router]);

  useEffect(() => {
    (async () => {
      const whoamiRes = await fetch("/api/admin/whoami");
      if (whoamiRes.status === 401) {
        router.replace("/admin");
        return;
      }
      const identity = await whoamiRes.json();
      setIsSuperAdmin(identity.isSuperAdmin);

      if (identity.isSuperAdmin) {
        const [statsRes] = await Promise.all([fetch("/api/admin/stats"), loadFullUsers("")]);
        if (statsRes.ok) setStats(await statsRes.json());
      } else {
        await loadFullUsers("");
      }
      setLoading(false);
    })();
  }, [loadFullUsers, router]);

  useEffect(() => {
    if (isSuperAdmin) {
      const timeout = setTimeout(() => loadFullUsers(search), 300);
      return () => clearTimeout(timeout);
    }
  }, [search, isSuperAdmin, loadFullUsers]);

  const handleClaimSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSearching(true);
    setClaimMessage(null);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(searchInput.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleClaim = async (id: number) => {
    setClaimingId(id);
    setClaimMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/claim`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setClaimMessage(data.error || "Could not claim this user.");
      } else {
        setClaimMessage("User claimed. They now appear in My Users below.");
        setSearchResults(null);
        setSearchInput("");
        loadFullUsers("");
      }
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="max-w-5xl mx-auto px-5 py-6">
        {isSuperAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="bg-card rounded-2xl p-4 border border-white/5">
              <p className="text-xs text-muted mb-1">Total Users</p>
              <p className="text-2xl font-bold">{stats?.totalUsers ?? 0}</p>
            </div>
            <div className="bg-card rounded-2xl p-4 border border-white/5">
              <p className="text-xs text-muted mb-1">BTC Under Management</p>
              <p className="text-2xl font-bold">{stats?.totalBtc.toFixed(4) ?? "0"}</p>
            </div>
            <div className="bg-card rounded-2xl p-4 border border-white/5">
              <p className="text-xs text-muted mb-1">ETH Under Management</p>
              <p className="text-2xl font-bold">{stats?.totalEth.toFixed(4) ?? "0"}</p>
            </div>
            <div className="bg-card rounded-2xl p-4 border border-white/5">
              <p className="text-xs text-muted mb-1">Pending Withdrawals</p>
              <p className="text-2xl font-bold text-accent">{stats?.pendingWithdrawals ?? 0}</p>
            </div>
          </div>
        )}

        {!isSuperAdmin && (
          <div className="bg-card rounded-2xl p-5 border border-white/5 mb-8">
            <h2 className="font-semibold mb-1">Find & Claim a User</h2>
            <p className="text-sm text-muted mb-4">
              Enter their exact full name (as shown on Telegram) or exact phone number. Matches are only shown for
              exact hits, and you must claim a user before you can manage them.
            </p>
            <form onSubmit={handleClaimSearch} className="flex gap-2 mb-2">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="e.g. Johnny Hackle or +38970..."
                className="flex-1 bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={searching}
                className="bg-accent hover:bg-accent-dark disabled:opacity-60 transition-colors text-navy font-semibold px-5 py-2.5 rounded-xl text-sm whitespace-nowrap"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </form>

            {claimMessage && <p className="text-sm text-accent mb-2">{claimMessage}</p>}

            {searchResults !== null && (
              <div className="space-y-2 mt-3">
                {searchResults.length === 0 && (
                  <p className="text-sm text-muted">No exact match found. Double-check the spelling or phone number.</p>
                )}
                {searchResults.map((u) => (
                  <div key={u.id} className="bg-navy rounded-xl p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">
                        {[u.first_name, u.last_name].filter(Boolean).join(" ") || "Unnamed"}
                      </p>
                      <p className="text-xs text-muted">
                        {u.username ? `@${u.username}` : "no username"} · {u.phone || "no phone"}
                      </p>
                    </div>
                    {u.claimStatus === "mine" && (
                      <Link href={`/admin/users/${u.id}`} className="text-xs bg-accent/15 text-accent px-3 py-1.5 rounded-lg whitespace-nowrap">
                        Already yours →
                      </Link>
                    )}
                    {u.claimStatus === "claimed_by_other" && (
                      <span className="text-xs bg-white/10 text-muted px-3 py-1.5 rounded-lg whitespace-nowrap">
                        Claimed by another admin
                      </span>
                    )}
                    {u.claimStatus === "unclaimed" && (
                      <button
                        onClick={() => handleClaim(u.id)}
                        disabled={claimingId === u.id}
                        className="text-xs bg-accent hover:bg-accent-dark disabled:opacity-60 transition-colors text-navy font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap"
                      >
                        {claimingId === u.id ? "Claiming..." : "Claim"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-lg font-semibold">{isSuperAdmin ? "Users" : "My Users"}</h2>
          {isSuperAdmin && (
            <input
              type="text"
              placeholder="Search by name, username, phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-card border border-white/10 rounded-xl px-4 py-2 text-sm w-64 focus:outline-none focus:border-accent"
            />
          )}
        </div>

        <div className="bg-card rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-white/5">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">BTC</th>
                  <th className="px-4 py-3 font-medium">ETH</th>
                  <th className="px-4 py-3 font-medium">USD Cash</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {isSuperAdmin && <th className="px-4 py-3 font-medium">Claimed By</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer"
                    onClick={() => router.push(`/admin/users/${u.id}`)}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="hover:text-accent">
                        {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{u.username ? `@${u.username}` : "—"}</td>
                    <td className="px-4 py-3 text-muted">{u.phone || "—"}</td>
                    <td className="px-4 py-3">{Number(u.btc_amount).toFixed(6)}</td>
                    <td className="px-4 py-3">{Number(u.eth_amount).toFixed(6)}</td>
                    <td className="px-4 py-3">${Number(u.usd_cash).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${u.is_active ? "bg-accent/15 text-accent" : "bg-danger/15 text-danger"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 text-muted text-xs">
                        {u.assigned_admin_id
                          ? [u.assigned_admin_first_name, u.assigned_admin_last_name].filter(Boolean).join(" ") || "Admin"
                          : "Unclaimed"}
                      </td>
                    )}
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={isSuperAdmin ? 8 : 7} className="px-4 py-8 text-center text-muted">
                      {isSuperAdmin ? "No users found." : "You haven't claimed any users yet — search above to find one."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
