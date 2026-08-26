"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/app/components/AdminNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Stats = {
  totalUsers: number;
  totalBtc: number;
  totalEth: number;
  totalUsdCash: number;
  pendingWithdrawals: number;
};

type MyStats = {
  myUsers: number;
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

type AdminOption = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [users, setUsers] = useState<FullUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [reassigningId, setReassigningId] = useState<number | null>(null);

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
        const [statsRes, adminsRes] = await Promise.all([fetch("/api/admin/stats"), fetch("/api/admin/admins"), loadFullUsers("")]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (adminsRes.ok) setAdmins((await adminsRes.json()).admins);
      } else {
        const [statsRes] = await Promise.all([fetch("/api/admin/stats"), loadFullUsers("")]);
        if (statsRes.ok) setMyStats(await statsRes.json());
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

  const handleReassign = async (userId: number, adminId: string) => {
    setReassigningId(userId);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedAdminId: adminId ? Number(adminId) : null }),
      });
      loadFullUsers(search);
    } finally {
      setReassigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy">
        <AdminNav />
        <main className="max-w-5xl mx-auto px-5 py-6">
          <Skeleton className="h-24 w-full rounded-2xl bg-card-navy mb-6" />
          <Skeleton className="h-96 w-full rounded-2xl bg-card-navy" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy">
      <AdminNav />
      <main className="max-w-5xl mx-auto px-5 py-6">
        {isSuperAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total Users</p>
              <p className="text-2xl font-bold text-gold">{stats?.totalUsers ?? 0}</p>
            </Card>
            <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">BTC Under Management</p>
              <p className="text-2xl font-bold text-gold">{stats?.totalBtc.toFixed(4) ?? "0"}</p>
            </Card>
            <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">ETH Under Management</p>
              <p className="text-2xl font-bold text-gold">{stats?.totalEth.toFixed(4) ?? "0"}</p>
            </Card>
            <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Pending Withdrawals</p>
              <p className="text-2xl font-bold text-patriot-red">{stats?.pendingWithdrawals ?? 0}</p>
            </Card>
          </div>
        )}

        {!isSuperAdmin && (
          <div className="grid grid-cols-2 gap-3 mb-8">
            <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">My Users</p>
              <p className="text-2xl font-bold text-gold">{myStats?.myUsers ?? 0}</p>
            </Card>
            <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Pending Withdrawals</p>
              <p className="text-2xl font-bold text-patriot-red">{myStats?.pendingWithdrawals ?? 0}</p>
            </Card>
          </div>
        )}

        {!isSuperAdmin && (
          <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5 mb-8">
            <h2 className="font-bold uppercase tracking-wide text-gold mb-1">Find & Claim a User</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter their exact full name (as shown on Telegram) or exact phone number. Matches are only shown for
              exact hits, and you must claim a user before you can manage them.
            </p>
            <form onSubmit={handleClaimSearch} className="flex gap-2 mb-2">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="e.g. Johnny Hackle or +38970..."
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white flex-1"
              />
              <Button
                type="submit"
                disabled={searching}
                className="bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-60 whitespace-nowrap"
              >
                {searching ? "Searching..." : "Search"}
              </Button>
            </form>

            {claimMessage && <p className="text-sm text-gold mb-2">{claimMessage}</p>}

            {searchResults !== null && (
              <div className="space-y-2 mt-3">
                {searchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground">No exact match found. Double-check the spelling or phone number.</p>
                )}
                {searchResults.map((u) => (
                  <div key={u.id} className="bg-navy rounded-xl p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm text-white">
                        {[u.first_name, u.last_name].filter(Boolean).join(" ") || "Unnamed"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {u.username ? `@${u.username}` : "no username"} · {u.phone || "no phone"}
                      </p>
                    </div>
                    {u.claimStatus === "mine" && (
                      <Link href={`/admin/users/${u.id}`}>
                        <Badge variant="outline" className="bg-gold/15 text-gold border-gold/30 whitespace-nowrap">
                          Already yours →
                        </Badge>
                      </Link>
                    )}
                    {u.claimStatus === "claimed_by_other" && (
                      <Badge variant="outline" className="bg-white/10 text-muted-foreground whitespace-nowrap">
                        Claimed by another admin
                      </Badge>
                    )}
                    {u.claimStatus === "unclaimed" && (
                      <Button
                        size="sm"
                        onClick={() => handleClaim(u.id)}
                        disabled={claimingId === u.id}
                        className="bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-60 whitespace-nowrap"
                      >
                        {claimingId === u.id ? "Claiming..." : "Claim"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-lg font-bold uppercase tracking-wide text-white">{isSuperAdmin ? "Users" : "My Users"}</h2>
          {isSuperAdmin && (
            <Input
              type="text"
              placeholder="Search by name, username, phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-card-navy border-[#1a3a6e] focus-visible:border-gold text-white w-64"
            />
          )}
        </div>

        <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#1a3a6e] hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Username</TableHead>
                  <TableHead className="text-muted-foreground">Phone</TableHead>
                  <TableHead className="text-muted-foreground">Balance</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  {isSuperAdmin && <TableHead className="text-muted-foreground">Claimed By</TableHead>}
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="border-[#1a3a6e]">
                    <TableCell className="text-white">
                      {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.username ? `@${u.username}` : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.phone || "—"}</TableCell>
                    <TableCell className="text-white text-xs">
                      {Number(u.btc_amount).toFixed(4)} BTC / {Number(u.eth_amount).toFixed(4)} ETH / ${Number(u.usd_cash).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={u.is_active ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-patriot-red/15 text-patriot-red border-patriot-red/30"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-xs">
                        <select
                          value={u.assigned_admin_id ?? ""}
                          onChange={(e) => handleReassign(u.id, e.target.value)}
                          disabled={reassigningId === u.id}
                          className="bg-navy border border-[#1a3a6e] rounded-md px-2 py-1 text-white text-xs focus-visible:border-gold disabled:opacity-60"
                        >
                          <option value="">Unassigned</option>
                          {admins.map((a) => (
                            <option key={a.id} value={a.id}>
                              {[a.first_name, a.last_name].filter(Boolean).join(" ") || a.username || `Admin #${a.id}`}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                    )}
                    <TableCell>
                      <Link href={`/admin/users/${u.id}`}>
                        <Button size="sm" variant="outline" className="border-gold text-gold hover:bg-gold/10">
                          Manage
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">
                      {isSuperAdmin ? "No users found." : "You haven't claimed any users yet — search above to find one."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
}
