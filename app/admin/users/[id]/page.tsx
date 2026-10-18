"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/app/components/AdminNav";
import AdminDocuments from "@/app/components/AdminDocuments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Send, UserX, Wand2 } from "lucide-react";

type UserDetail = {
  user: {
    id: number;
    telegram_id: string;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    phone: string | null;
    is_active: boolean;
    is_admin: boolean;
    is_super_admin: boolean;
    release_paid: boolean;
    assigned_admin_id: number | null;
    support_contact: string | null;
    btc_address: string | null;
    eth_address: string | null;
    release_fee_title: string | null;
    release_fee_note: string | null;
    release_fee_amount: string | null;
    release_fee_currency: string | null;
    release_fee_discount_type: "percent" | "fixed" | null;
    release_fee_discount_value: string | null;
    release_deadline: string | null;
    created_at: string;
  };
  balance: { btc_amount: string; eth_amount: string; usd_cash: string; gold_amount: string };
  transactions: { id: number; type: string; amount: string; currency: string; status: string; note: string | null; created_at: string }[];
  withdrawals: { id: number; amount: string; currency: string; wallet_address: string | null; status: string; created_at: string }[];
};

type AdminOption = { id: number; first_name: string | null; last_name: string | null; username: string | null };

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Switch({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className="flex items-center gap-2.5 py-1.5 text-sm text-white disabled:opacity-50 focus-visible:outline-offset-4 rounded-lg"
    >
      <span className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${checked ? "bg-brand" : "bg-[#2a3a52]"}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-foreground transition-transform ${checked ? "translate-x-4" : ""}`} />
      </span>
      {label}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </button>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<UserDetail | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [selfId, setSelfId] = useState<number | null>(null);
  const [tab, setTab] = useState<"funds" | "release" | "contact" | "docs" | "activity">("funds");
  const [btcAmount, setBtcAmount] = useState("");
  const [ethAmount, setEthAmount] = useState("");
  const [usdCash, setUsdCash] = useState("");
  const [goldAmount, setGoldAmount] = useState("");
  const [supportContact, setSupportContact] = useState("");
  const [btcAddress, setBtcAddress] = useState("");
  const [ethAddress, setEthAddress] = useState("");
  const [releaseFeeTitle, setReleaseFeeTitle] = useState("");
  const [releaseFeeNote, setReleaseFeeNote] = useState("");
  const [releaseFeeAmount, setReleaseFeeAmount] = useState("");
  const [releaseFeeCurrency, setReleaseFeeCurrency] = useState("USD");
  const [releaseFeeDiscountType, setReleaseFeeDiscountType] = useState<"percent" | "fixed" | "">("");
  const [releaseFeeDiscountValue, setReleaseFeeDiscountValue] = useState("");
  const [releaseDeadline, setReleaseDeadline] = useState("");
  const [messageText, setMessageText] = useState("");
  const [usdQuickSet, setUsdQuickSet] = useState("");
  const [prices, setPrices] = useState<{ btc: number; eth: number; gold: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [reassigning, setReassigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    const [whoamiRes, res, pricesRes] = await Promise.all([
      fetch("/api/admin/whoami"),
      fetch(`/api/admin/users/${id}`),
      fetch("/api/prices"),
    ]);

    if (whoamiRes.status === 401 || res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (whoamiRes.ok) {
      const identity = await whoamiRes.json();
      setIsSuperAdmin(identity.isSuperAdmin);
      setCanManage(identity.canManageAdmins === true);
      setSelfId(identity.userId ?? null);
      if (identity.isSuperAdmin) {
        const adminsRes = await fetch("/api/admin/admins");
        if (adminsRes.ok) setAdmins((await adminsRes.json()).admins);
      }
    }
    if (pricesRes.ok) {
      const p = await pricesRes.json();
      setPrices({ btc: p.btc, eth: p.eth, gold: p.gold });
    }
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    if (res.ok) {
      const json = await res.json();
      setData(json);
      setBtcAmount(json.balance.btc_amount);
      setEthAmount(json.balance.eth_amount);
      setUsdCash(json.balance.usd_cash);
      setGoldAmount(json.balance.gold_amount);
      setSupportContact(json.user.support_contact || "");
      setBtcAddress(json.user.btc_address || "");
      setEthAddress(json.user.eth_address || "");
      setReleaseFeeTitle(json.user.release_fee_title || "");
      setReleaseFeeNote(json.user.release_fee_note || "");
      setReleaseFeeAmount(json.user.release_fee_amount ?? "");
      setReleaseFeeCurrency(json.user.release_fee_currency || "USD");
      setReleaseFeeDiscountType(json.user.release_fee_discount_type || "");
      setReleaseFeeDiscountValue(json.user.release_fee_discount_value ?? "");
      setReleaseDeadline(json.user.release_deadline ? toDatetimeLocal(json.user.release_deadline) : "");
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleQuickSetUsd = (value: string) => {
    setUsdQuickSet(value);
    const usd = Number(value);
    if (!usd || !prices) return;
    setBtcAmount((usd / prices.btc).toFixed(8));
    setEthAmount((usd / prices.eth).toFixed(8));
    setGoldAmount((usd / prices.gold).toFixed(4));
    setUsdCash(usd.toFixed(2));
  };

  const handleSaveBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          btcAmount: Number(btcAmount),
          ethAmount: Number(ethAmount),
          usdCash: Number(usdCash),
          goldAmount: Number(goldAmount),
        }),
      });
      if (res.ok) {
        toast.add({ title: "Balance updated", type: "success" });
        load();
      } else {
        toast.add({ title: "Failed to update balance", type: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!data) return;
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !data.user.is_active }),
    });
    load();
  };

  const toggleAdmin = async () => {
    if (!data) return;
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: !data.user.is_admin }),
    });
    load();
  };

  const toggleSuperAdmin = async () => {
    if (!data) return;
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSuperAdmin: !data.user.is_super_admin }),
    });
    load();
  };

  const handleReassign = async (adminId: string) => {
    setReassigning(true);
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedAdminId: adminId ? Number(adminId) : null }),
      });
      load();
    } finally {
      setReassigning(false);
    }
  };

  const toggleReleasePaid = async () => {
    if (!data) return;
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releasePaid: !data.user.release_paid }),
    });
    load();
  };

  const handleSaveContactAndAddresses = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supportContact, btcAddress, ethAddress }),
      });
      toast.add({ title: "Saved", type: "success" });
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReleaseFee = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseFeeTitle: releaseFeeTitle || null,
          releaseFeeNote: releaseFeeNote || null,
          releaseFeeAmount: releaseFeeAmount === "" ? null : Number(releaseFeeAmount),
          releaseFeeCurrency: releaseFeeCurrency || null,
          releaseFeeDiscountType: releaseFeeDiscountType || null,
          releaseFeeDiscountValue: releaseFeeDiscountValue === "" ? null : Number(releaseFeeDiscountValue),
        }),
      });
      toast.add({ title: "Release fee saved", type: "success" });
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleClearReleaseFee = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseFeeTitle: null,
          releaseFeeNote: null,
          releaseFeeAmount: null,
          releaseFeeCurrency: null,
          releaseFeeDiscountType: null,
          releaseFeeDiscountValue: null,
        }),
      });
      setReleaseFeeTitle("");
      setReleaseFeeNote("");
      setReleaseFeeAmount("");
      setReleaseFeeCurrency("USD");
      setReleaseFeeDiscountType("");
      setReleaseFeeDiscountValue("");
      toast.add({ title: "Release fee cleared", type: "success" });
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReleaseDeadline = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseDeadline: releaseDeadline ? new Date(releaseDeadline).toISOString() : null,
        }),
      });
      toast.add({ title: "Release timer saved", type: "success" });
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleClearReleaseDeadline = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseDeadline: null }),
      });
      setReleaseDeadline("");
      toast.add({ title: "Release timer cleared", type: "success" });
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAddTime = (hours: number) => {
    const base = releaseDeadline ? new Date(releaseDeadline) : new Date();
    const from = base.getTime() > Date.now() ? base : new Date();
    from.setHours(from.getHours() + hours);
    setReleaseDeadline(toDatetimeLocal(from.toISOString()));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/admin/users/${id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: messageText }),
      });
      if (res.ok) {
        toast.add({ title: "Message sent", type: "success" });
        setMessageText("");
        load();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.add({ title: errData.error || "Failed to send message", type: "error" });
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.add({ title: "User deleted — they can sign up again from scratch", type: "success" });
        router.replace("/admin/dashboard");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.add({ title: errData.error || "Failed to delete user", type: "error" });
        setDeleting(false);
        setConfirmDelete(false);
      }
    } catch {
      toast.add({ title: "Failed to delete user", type: "error" });
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (forbidden) {
    return (
      <div className="min-h-screen bg-navy">
        <AdminNav />
        <main className="max-w-4xl mx-auto px-5 py-6 text-center">
          <p className="text-patriot-red font-bold mb-2">You haven&apos;t claimed this user</p>
          <p className="text-sm text-muted-foreground mb-4">Search for them by exact name or phone on the dashboard to claim them first.</p>
          <Link href="/admin/dashboard" className="text-brand text-sm">← Back to dashboard</Link>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-navy">
        <AdminNav />
        <main className="max-w-4xl mx-auto px-5 py-6">
          <Skeleton className="h-24 w-full rounded-2xl bg-card-navy mb-6" />
          <Skeleton className="h-96 w-full rounded-2xl bg-card-navy" />
        </main>
      </div>
    );
  }

  const { user, transactions, withdrawals } = data;
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Unnamed User";
  const fmtUsd = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const n = (v: string | number | null | undefined) => Number(v ?? 0);
  const holdings = prices
    ? {
        btc: n(data.balance.btc_amount) * prices.btc,
        eth: n(data.balance.eth_amount) * prices.eth,
        gold: n(data.balance.gold_amount) * prices.gold,
        cash: n(data.balance.usd_cash),
      }
    : null;
  // Portfolio value is the cash balance set here, same as the client sees.
  const total = holdings ? holdings.cash : null;
  const isSelf = selfId !== null && selfId === user.id;

  const fieldClass =
    "rounded-none border-0 border-b border-line bg-transparent px-0.5 h-11 text-base text-white focus-visible:ring-0 focus-visible:border-brand tabular-nums";
  const labelClass = "text-xs text-muted-foreground mb-1 block";
  const sectionClass = "text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold pb-2.5 border-b border-line/70 mb-4";
  const primaryBtn =
    "bg-brand-gradient text-navy font-bold uppercase tracking-wide shadow-brand-glow hover:brightness-105 disabled:opacity-60 h-11 rounded-xl px-6";
  const textBtn = "text-xs font-bold uppercase tracking-wide px-1 disabled:opacity-50";

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "funds", label: "Funds" },
    { key: "release", label: "Release" },
    { key: "contact", label: "Contact" },
    { key: "docs", label: "Documents" },
    { key: "activity", label: "Activity" },
  ];

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      completed: "text-verified-bright border-verified/30",
      approved: "text-verified-bright border-verified/30",
      pending: "text-premium border-premium/30",
      rejected: "text-patriot-red-bright border-patriot-red/30",
    };
    return (
      <span className={`inline-flex items-center h-5 px-2 text-[10px] font-semibold rounded-full border capitalize ${map[s] ?? "text-muted-foreground border-line"}`}>
        {s === "rejected" ? "Declined" : s}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-navy">
      <AdminNav />
      <main className="max-w-4xl mx-auto px-4 sm:px-5 py-6">
        <Link href="/admin/dashboard" className="text-muted-foreground text-sm mb-5 inline-flex items-center gap-1.5 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> All users
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar className="w-14 h-14">
              <AvatarFallback className="bg-brand-gradient text-navy font-bold text-xl">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-white truncate">{displayName}</h1>
              <p className="text-xs text-muted-foreground break-words">
                {user.username ? `@${user.username}` : "no username"} · Telegram ID {user.telegram_id} · {user.phone || "no phone"}
              </p>
            </div>
          </div>
          {isSuperAdmin && (
            <div className="shrink-0">
              <label htmlFor="managed-by" className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold block mb-1">
                Managed by
              </label>
              <select
                id="managed-by"
                value={user.assigned_admin_id ?? ""}
                onChange={(e) => handleReassign(e.target.value)}
                disabled={reassigning}
                className="bg-transparent border-0 border-b border-line text-sm text-white py-2 pr-6 min-w-[170px] focus-visible:border-brand disabled:opacity-60"
              >
                <option value="" className="bg-card-navy">Unassigned</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id} className="bg-card-navy">
                    {[a.first_name, a.last_name].filter(Boolean).join(" ") || a.username || `Admin #${a.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-x-7 gap-y-1 mt-5 py-3 border-y border-line/70" role="group" aria-label="Account status">
          <Switch label="Active" checked={user.is_active} onChange={toggleActive} />
          <Switch label="Release fee paid" checked={user.release_paid} onChange={toggleReleasePaid} />
          {isSuperAdmin && <Switch label="Admin" hint="super admins only" checked={user.is_admin} onChange={toggleAdmin} disabled={isSelf} />}
          {canManage && !isSelf && (
            <Switch label="Super admin" hint="can add other super admins" checked={user.is_super_admin} onChange={toggleSuperAdmin} />
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-y-4 mt-5">
          <div className="col-span-2 sm:col-span-1 sm:pr-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Portfolio value</p>
            <p className="text-2xl font-semibold tabular-nums text-premium-gradient mt-0.5 break-words">{total === null ? "—" : fmtUsd(total)}</p>
          </div>
          {[
            { label: "Bitcoin", value: String(n(data.balance.btc_amount)), sub: holdings ? fmtUsd(holdings.btc) : "" },
            { label: "Ethereum", value: String(n(data.balance.eth_amount)), sub: holdings ? fmtUsd(holdings.eth) : "" },
            { label: "Gold", value: `${n(data.balance.gold_amount)} oz`, sub: holdings ? fmtUsd(holdings.gold) : "" },
            { label: "Cash", value: fmtUsd(n(data.balance.usd_cash)), sub: "USD" },
          ].map((s) => (
            <div key={s.label} className="sm:border-l sm:border-line/70 sm:pl-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">{s.label}</p>
              <p className="text-lg font-semibold tabular-nums text-white mt-0.5 break-words">{s.value}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{s.sub}</p>
            </div>
          ))}
        </div>

        <div role="tablist" aria-label="Client sections" className="no-scrollbar flex gap-7 border-b border-line/70 mt-7 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 text-sm font-medium whitespace-nowrap -mb-px border-b-2 transition-colors ${
                tab === t.key ? "text-white border-brand" : "text-muted-foreground border-transparent hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="pt-6" role="tabpanel">
          {tab === "funds" && (
            <form onSubmit={handleSaveBalance}>
              <div className="flex items-end gap-3 mb-7">
                <div className="flex-1">
                  <Label htmlFor="usd-total" className={labelClass}>Set everything from one USD total</Label>
                  <Input
                    id="usd-total"
                    type="number"
                    step="any"
                    value={usdQuickSet}
                    onChange={(e) => handleQuickSetUsd(e.target.value)}
                    disabled={!prices}
                    placeholder="e.g. 128450"
                    className={fieldClass}
                  />
                </div>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground pb-3">
                  <Wand2 className="w-4 h-4 text-brand-bright" /> splits at live prices
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-9 gap-y-6">
                <div>
                  <Label htmlFor="f-btc" className={labelClass}>Bitcoin (BTC)</Label>
                  <Input id="f-btc" type="number" step="any" value={btcAmount} onChange={(e) => setBtcAmount(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <Label htmlFor="f-eth" className={labelClass}>Ethereum (ETH)</Label>
                  <Input id="f-eth" type="number" step="any" value={ethAmount} onChange={(e) => setEthAmount(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <Label htmlFor="f-gold" className={labelClass}>Gold (oz)</Label>
                  <Input id="f-gold" type="number" step="any" value={goldAmount} onChange={(e) => setGoldAmount(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <Label htmlFor="f-usd" className={labelClass}>Cash (USD)</Label>
                  <Input id="f-usd" type="number" step="any" value={usdCash} onChange={(e) => setUsdCash(e.target.value)} className={fieldClass} />
                </div>
              </div>
              <div className="mt-7">
                <Button type="submit" disabled={saving} className={primaryBtn}>
                  {saving ? "Saving..." : "Save balances"}
                </Button>
              </div>
            </form>
          )}

          {tab === "release" && (
            <div>
              <p className={sectionClass}>Release fee</p>
              <div className="grid sm:grid-cols-2 gap-x-9 gap-y-6">
                <div>
                  <Label htmlFor="r-title" className={labelClass}>Title</Label>
                  <Input id="r-title" value={releaseFeeTitle} onChange={(e) => setReleaseFeeTitle(e.target.value)} placeholder="e.g. Standard Release" className={fieldClass} />
                </div>
                <div>
                  <Label htmlFor="r-desc" className={labelClass}>Description shown to the client</Label>
                  <Input id="r-desc" value={releaseFeeNote} onChange={(e) => setReleaseFeeNote(e.target.value)} placeholder="Shown under the title" className={fieldClass} />
                </div>
                <div>
                  <Label htmlFor="r-amt" className={labelClass}>Amount</Label>
                  <Input id="r-amt" type="number" step="any" value={releaseFeeAmount} onChange={(e) => setReleaseFeeAmount(e.target.value)} placeholder="e.g. 50" className={fieldClass} />
                </div>
                <div>
                  <Label htmlFor="r-cur" className={labelClass}>Currency</Label>
                  <Input id="r-cur" value={releaseFeeCurrency} onChange={(e) => setReleaseFeeCurrency(e.target.value.toUpperCase())} placeholder="USD" className={fieldClass} />
                </div>
                <div>
                  <Label htmlFor="r-dtype" className={labelClass}>Discount type</Label>
                  <select
                    id="r-dtype"
                    value={releaseFeeDiscountType}
                    onChange={(e) => setReleaseFeeDiscountType(e.target.value as "percent" | "fixed" | "")}
                    className="w-full h-11 bg-transparent border-0 border-b border-line text-base text-white focus-visible:border-brand"
                  >
                    <option value="" className="bg-card-navy">None</option>
                    <option value="percent" className="bg-card-navy">Percent</option>
                    <option value="fixed" className="bg-card-navy">Fixed amount</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="r-dval" className={labelClass}>
                    {releaseFeeDiscountType === "percent" ? "Discount (%)" : "Discount amount"}
                  </Label>
                  <Input
                    id="r-dval"
                    type="number"
                    step="any"
                    value={releaseFeeDiscountValue}
                    onChange={(e) => setReleaseFeeDiscountValue(e.target.value)}
                    disabled={!releaseFeeDiscountType}
                    placeholder={releaseFeeDiscountType === "percent" ? "e.g. 20" : "e.g. 10"}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div className="flex items-center gap-5 mt-6">
                <Button onClick={handleSaveReleaseFee} disabled={saving} className={primaryBtn}>Save fee</Button>
                <button onClick={handleClearReleaseFee} disabled={saving} className={`${textBtn} text-patriot-red-bright`}>Clear</button>
              </div>

              <p className={`${sectionClass} mt-10`}>Release timer</p>
              <div className="grid sm:grid-cols-2 gap-x-9 gap-y-6">
                <div>
                  <Label htmlFor="r-deadline" className={labelClass}>Deadline</Label>
                  <Input id="r-deadline" type="datetime-local" value={releaseDeadline} onChange={(e) => setReleaseDeadline(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <span className={labelClass}>Add time</span>
                  <div className="flex gap-2 mt-2">
                    {[
                      { h: 24, l: "+24 h" },
                      { h: 72, l: "+3 days" },
                      { h: 168, l: "+7 days" },
                    ].map((q) => (
                      <button
                        key={q.h}
                        type="button"
                        onClick={() => handleQuickAddTime(q.h)}
                        className="h-9 px-4 rounded-full bg-brand/10 text-brand-bright text-xs font-semibold hover:bg-brand/20 transition-colors"
                      >
                        {q.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-5 mt-6">
                <Button onClick={handleSaveReleaseDeadline} disabled={saving} className={primaryBtn}>Save deadline</Button>
                <button onClick={handleClearReleaseDeadline} disabled={saving} className={`${textBtn} text-patriot-red-bright`}>Clear</button>
              </div>
            </div>
          )}

          {tab === "contact" && (
            <div>
              <p className={sectionClass}>Deposit addresses and support</p>
              <div className="grid sm:grid-cols-2 gap-x-9 gap-y-6">
                <div className="sm:col-span-2">
                  <Label htmlFor="c-btc" className={labelClass}>Bitcoin address</Label>
                  <Input id="c-btc" value={btcAddress} onChange={(e) => setBtcAddress(e.target.value)} placeholder="bc1q..." className={`${fieldClass} font-mono text-sm`} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="c-eth" className={labelClass}>Ethereum address</Label>
                  <Input id="c-eth" value={ethAddress} onChange={(e) => setEthAddress(e.target.value)} placeholder="0x..." className={`${fieldClass} font-mono text-sm`} />
                </div>
                <div>
                  <Label htmlFor="c-support" className={labelClass}>Support contact</Label>
                  <Input id="c-support" value={supportContact} onChange={(e) => setSupportContact(e.target.value)} placeholder="Telegram username" className={fieldClass} />
                </div>
              </div>
              <div className="mt-6">
                <Button onClick={handleSaveContactAndAddresses} disabled={saving} className={primaryBtn}>Save</Button>
              </div>

              <p className={`${sectionClass} mt-10`}>Message through the bot</p>
              <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                <div className="flex-1">
                  <Label htmlFor="c-msg" className={labelClass}>Sends a Telegram message to this client right now</Label>
                  <Input id="c-msg" value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Write a message" className={fieldClass} />
                </div>
                <Button type="submit" disabled={sendingMessage || !messageText.trim()} className={primaryBtn}>
                  <Send className="w-4 h-4 mr-1.5" />
                  {sendingMessage ? "Sending..." : "Send"}
                </Button>
              </form>
            </div>
          )}

          {tab === "docs" && <AdminDocuments userId={id} />}

          {tab === "activity" && (
            <div className="grid md:grid-cols-2 gap-x-9 gap-y-8">
              <div>
                <p className={sectionClass}>Transactions</p>
                {transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transactions yet.</p>
                ) : (
                  <ul className="max-h-[28rem] overflow-y-auto">
                    {transactions.map((t) => (
                      <li key={t.id} className="flex items-center gap-3 py-3 border-b border-line/60">
                        <span className="graphite-chip flex items-center justify-center w-9 h-9 rounded-full shrink-0">
                          {t.type === "deposit" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white capitalize">{t.type}</p>
                          <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold tabular-nums text-white">{Number(t.amount) !== 0 ? `${t.amount} ${t.currency}` : ""}</p>
                          {statusBadge(t.status)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className={sectionClass}>Withdrawal requests</p>
                {withdrawals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None yet.</p>
                ) : (
                  <ul className="max-h-[28rem] overflow-y-auto">
                    {withdrawals.map((w) => (
                      <li key={w.id} className="flex items-center gap-3 py-3 border-b border-line/60">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white tabular-nums">
                            {w.currency === "USD" ? fmtUsd(Number(w.amount)) : `${Number(w.amount)} ${w.currency}`}
                          </p>
                          <p className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                        </div>
                        {statusBadge(w.status)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {isSuperAdmin && (
          <div className="mt-10 pt-4 border-t border-line/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground max-w-prose">
              Deleting a client removes all their data. They can open the bot and sign up again from scratch.
            </p>
            <button
              onClick={handleDeleteUser}
              disabled={deleting}
              className={`${textBtn} text-patriot-red-bright flex items-center gap-1.5 shrink-0`}
            >
              <UserX className="w-4 h-4" />
              {deleting ? "Deleting..." : confirmDelete ? "Confirm delete, this cannot be undone" : "Delete client"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
