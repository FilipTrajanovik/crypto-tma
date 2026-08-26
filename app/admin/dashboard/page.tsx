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

type User = {
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
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async (q: string) => {
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
      const [statsRes] = await Promise.all([fetch("/api/admin/stats"), loadUsers("")]);
      if (statsRes.status === 401) {
        router.replace("/admin");
        return;
      }
      if (statsRes.ok) setStats(await statsRes.json());
      setLoading(false);
    })();
  }, [loadUsers, router]);

  useEffect(() => {
    const timeout = setTimeout(() => loadUsers(search), 300);
    return () => clearTimeout(timeout);
  }, [search, loadUsers]);

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

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Users</h2>
          <input
            type="text"
            placeholder="Search by name, username, phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-card border border-white/10 rounded-xl px-4 py-2 text-sm w-64 focus:outline-none focus:border-accent"
          />
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
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted">
                      No users found.
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
