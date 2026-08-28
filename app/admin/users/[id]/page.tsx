"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/app/components/AdminNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { ArrowLeft, Wand2, FileText, Upload, Trash2, UserX } from "lucide-react";

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
    release_deadline: string | null;
    created_at: string;
  };
  balance: { btc_amount: string; eth_amount: string; usd_cash: string; gold_amount: string };
  transactions: { id: number; type: string; amount: string; currency: string; status: string; note: string | null; created_at: string }[];
  investments: { id: number; amount: string; currency: string; status: string; plan_name: string; started_at: string; matures_at: string | null }[];
  withdrawals: { id: number; amount: string; currency: string; wallet_address: string | null; status: string; created_at: string }[];
};

type UserDoc = {
  id: number;
  file_name: string;
  mime_type: string;
  file_size: number;
  note: string | null;
  created_at: string;
};

type AdminOption = { id: number; first_name: string | null; last_name: string | null; username: string | null };

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDocSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<UserDetail | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [btcAmount, setBtcAmount] = useState("");
  const [ethAmount, setEthAmount] = useState("");
  const [usdCash, setUsdCash] = useState("");
  const [goldAmount, setGoldAmount] = useState("");
  const [note, setNote] = useState("");
  const [supportContact, setSupportContact] = useState("");
  const [btcAddress, setBtcAddress] = useState("");
  const [ethAddress, setEthAddress] = useState("");
  const [releaseFeeTitle, setReleaseFeeTitle] = useState("");
  const [releaseFeeNote, setReleaseFeeNote] = useState("");
  const [releaseFeeAmount, setReleaseFeeAmount] = useState("");
  const [releaseFeeCurrency, setReleaseFeeCurrency] = useState("USD");
  const [releaseDeadline, setReleaseDeadline] = useState("");
  const [messageText, setMessageText] = useState("");
  const [usdQuickSet, setUsdQuickSet] = useState("");
  const [prices, setPrices] = useState<{ btc: number; eth: number; gold: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [docs, setDocs] = useState<UserDoc[]>([]);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [reassigning, setReassigning] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docNote, setDocNote] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadDocs = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${id}/documents`);
    if (res.ok) {
      const data = await res.json();
      setDocs(data.documents);
    }
  }, [id]);

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
      setIsOwner(identity.isOwner);
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
      setReleaseDeadline(json.user.release_deadline ? toDatetimeLocal(json.user.release_deadline) : "");
    }
  }, [id, router]);

  useEffect(() => {
    load();
    loadDocs();
  }, [load, loadDocs]);

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
          note: note || undefined,
        }),
      });
      if (res.ok) {
        toast.add({ title: "Balance updated", type: "success" });
        setNote("");
        load();
      } else {
        toast.add({ title: "Failed to update balance", type: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      setNote("");
      toast.add({ title: "Note added", type: "success" });
      load();
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
        body: JSON.stringify({ releaseFeeTitle: null, releaseFeeNote: null, releaseFeeAmount: null, releaseFeeCurrency: null }),
      });
      setReleaseFeeTitle("");
      setReleaseFeeNote("");
      setReleaseFeeAmount("");
      setReleaseFeeCurrency("USD");
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

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", docFile);
      if (docNote.trim()) formData.append("note", docNote.trim());
      const res = await fetch(`/api/admin/users/${id}/documents`, { method: "POST", body: formData });
      if (res.ok) {
        toast.add({ title: "Document uploaded", type: "success" });
        setDocFile(null);
        setDocNote("");
        loadDocs();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.add({ title: errData.error || "Failed to upload document", type: "error" });
      }
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    await fetch(`/api/admin/users/${id}/documents/${docId}`, { method: "DELETE" });
    loadDocs();
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
          <Link href="/admin/dashboard" className="text-gold text-sm">← Back to dashboard</Link>
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

  const { user, transactions, investments, withdrawals } = data;
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Unnamed User";

  return (
    <div className="min-h-screen bg-navy">
      <AdminNav />
      <main className="max-w-4xl mx-auto px-5 py-6">
        <Link href="/admin/dashboard" className="text-muted-foreground text-sm mb-4 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border border-[#1a3a6e]">
              <AvatarFallback className="bg-gold/20 text-gold font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold text-white">{displayName}</h1>
              <p className="text-sm text-muted-foreground">
                {user.username ? `@${user.username}` : "no username"} · Telegram ID {user.telegram_id} · {user.phone || "no phone"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {isSuperAdmin && (
              <select
                value={user.assigned_admin_id ?? ""}
                onChange={(e) => handleReassign(e.target.value)}
                disabled={reassigning}
                className="bg-navy border border-[#1a3a6e] rounded-md px-2 py-1.5 text-white text-xs focus-visible:border-gold disabled:opacity-60"
              >
                <option value="">Unassigned</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {[a.first_name, a.last_name].filter(Boolean).join(" ") || a.username || `Admin #${a.id}`}
                  </option>
                ))}
              </select>
            )}
            <Badge
              onClick={toggleActive}
              variant="outline"
              className={`cursor-pointer ${user.is_active ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-patriot-red/15 text-patriot-red border-patriot-red/30"}`}
            >
              {user.is_active ? "Active" : "Inactive"} — toggle
            </Badge>
            {isSuperAdmin && (
              <Badge
                onClick={toggleAdmin}
                variant="outline"
                className={`cursor-pointer ${user.is_admin ? "bg-gold/15 text-gold border-gold/30" : "bg-white/10 text-muted-foreground"}`}
              >
                {user.is_admin ? "Admin" : "Not admin"} — toggle
              </Badge>
            )}
            {isOwner && (
              <Badge
                onClick={toggleSuperAdmin}
                variant="outline"
                className={`cursor-pointer ${user.is_super_admin ? "bg-patriot-red/15 text-patriot-red border-patriot-red/30" : "bg-white/10 text-muted-foreground"}`}
              >
                {user.is_super_admin ? "Super Admin" : "Not super admin"} — toggle
              </Badge>
            )}
            <Badge
              onClick={toggleReleasePaid}
              variant="outline"
              className={`cursor-pointer ${user.release_paid ? "bg-gold/15 text-gold border-gold/30" : "bg-white/10 text-muted-foreground"}`}
            >
              {user.release_paid ? "Release paid" : "Release unpaid"} — toggle
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5">
            <h2 className="font-bold uppercase tracking-wide text-gold mb-4">Edit Balances</h2>

            <div className="bg-navy rounded-xl p-3 mb-4 border border-gold/30">
              <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-gold" /> Set Balance by Total Amount
              </Label>
              <Input
                type="number"
                step="any"
                value={usdQuickSet}
                onChange={(e) => handleQuickSetUsd(e.target.value)}
                disabled={!prices}
                placeholder="Enter total USD amount"
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                {prices
                  ? `Enter one total amount here — it fills BTC, ETH, Gold, and USD Cash below at live prices (1 BTC = $${prices.btc.toLocaleString()} · 1 ETH = $${prices.eth.toLocaleString()} · 1 oz Gold = $${prices.gold.toLocaleString()}).`
                  : "Loading live prices..."}
              </p>
            </div>

            <form onSubmit={handleSaveBalance} className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">BTC Amount</Label>
                <Input
                  type="number"
                  step="any"
                  value={btcAmount}
                  onChange={(e) => setBtcAmount(e.target.value)}
                  className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">ETH Amount</Label>
                <Input
                  type="number"
                  step="any"
                  value={ethAmount}
                  onChange={(e) => setEthAmount(e.target.value)}
                  className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Gold Amount (oz)</Label>
                <Input
                  type="number"
                  step="any"
                  value={goldAmount}
                  onChange={(e) => setGoldAmount(e.target.value)}
                  className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">USD Cash</Label>
                <Input
                  type="number"
                  step="any"
                  value={usdCash}
                  onChange={(e) => setUsdCash(e.target.value)}
                  className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Note (optional)</Label>
                <Input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason for adjustment"
                  className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
                />
              </div>
              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Balance"}
              </Button>
            </form>
          </Card>

          <div className="space-y-6">
            <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5">
              <h2 className="font-bold uppercase tracking-wide text-gold mb-3">Add Manual Note</h2>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write a note..."
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white mb-3"
              />
              <Button
                onClick={handleAddNote}
                disabled={saving || !note.trim()}
                variant="secondary"
                className="w-full font-bold uppercase tracking-wide disabled:opacity-60"
              >
                Add Note
              </Button>
            </Card>

            <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-gold mb-2">Withdrawal Requests</h3>
              {withdrawals.length === 0 ? (
                <p className="text-xs text-muted-foreground">None yet.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {withdrawals.map((w) => (
                    <div key={w.id} className="text-xs bg-navy rounded-lg p-2 flex justify-between">
                      <span className="text-white">${Number(w.amount).toFixed(2)}</span>
                      <span className="capitalize text-muted-foreground">{w.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5 mb-6">
          <h2 className="font-bold uppercase tracking-wide text-gold mb-1">Deposit Addresses & Contact</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Custom BTC/ETH deposit addresses shown to this user only. Leave blank to use the platform default.
            Support contact overrides the auto-assigned claiming admin.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">BTC Address</Label>
              <Input
                value={btcAddress}
                onChange={(e) => setBtcAddress(e.target.value)}
                placeholder="bc1q..."
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">ETH Address</Label>
              <Input
                value={ethAddress}
                onChange={(e) => setEthAddress(e.target.value)}
                placeholder="0x..."
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Support Contact</Label>
              <Input
                value={supportContact}
                onChange={(e) => setSupportContact(e.target.value)}
                placeholder="Telegram username"
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white text-sm"
              />
            </div>
          </div>
          <Button
            onClick={handleSaveContactAndAddresses}
            disabled={saving}
            className="bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-60"
          >
            Save
          </Button>
        </Card>

        <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5 mb-6">
          <h2 className="font-bold uppercase tracking-wide text-gold mb-1">Release Fee</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Configured per user — shown on this user&apos;s Release Funds page. Leave the amount blank to show
            &quot;no release fee configured&quot; instead.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Title</Label>
              <Input
                value={releaseFeeTitle}
                onChange={(e) => setReleaseFeeTitle(e.target.value)}
                placeholder="e.g. Standard Release"
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Note (optional)</Label>
              <Input
                value={releaseFeeNote}
                onChange={(e) => setReleaseFeeNote(e.target.value)}
                placeholder="Shown under the title"
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Fee Amount</Label>
              <Input
                type="number"
                step="any"
                value={releaseFeeAmount}
                onChange={(e) => setReleaseFeeAmount(e.target.value)}
                placeholder="e.g. 50"
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Fee Currency</Label>
              <Input
                value={releaseFeeCurrency}
                onChange={(e) => setReleaseFeeCurrency(e.target.value)}
                placeholder="USD"
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSaveReleaseFee}
              disabled={saving}
              className="bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-60"
            >
              Save
            </Button>
            <Button
              onClick={handleClearReleaseFee}
              disabled={saving}
              variant="outline"
              className="border-patriot-red text-patriot-red hover:bg-patriot-red/10 font-bold uppercase tracking-wide disabled:opacity-60"
            >
              Clear
            </Button>
          </div>
        </Card>

        <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5 mb-6">
          <h2 className="font-bold uppercase tracking-wide text-gold mb-1">Release Timer</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Set a countdown deadline for this user to release their funds. Shown as a live timer on their Release
            Funds page. Leave blank for no timer.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Deadline</Label>
              <Input
                type="datetime-local"
                value={releaseDeadline}
                onChange={(e) => setReleaseDeadline(e.target.value)}
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Quick Add</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => handleQuickAddTime(24)} className="border-gold/40 text-gold hover:bg-gold/10">
                  +24h
                </Button>
                <Button type="button" variant="outline" onClick={() => handleQuickAddTime(72)} className="border-gold/40 text-gold hover:bg-gold/10">
                  +72h
                </Button>
                <Button type="button" variant="outline" onClick={() => handleQuickAddTime(168)} className="border-gold/40 text-gold hover:bg-gold/10">
                  +7d
                </Button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSaveReleaseDeadline}
              disabled={saving}
              className="bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-60"
            >
              Save
            </Button>
            <Button
              onClick={handleClearReleaseDeadline}
              disabled={saving}
              variant="outline"
              className="border-patriot-red text-patriot-red hover:bg-patriot-red/10 font-bold uppercase tracking-wide disabled:opacity-60"
            >
              Clear
            </Button>
          </div>
        </Card>

        <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5 mb-6">
          <h2 className="font-bold uppercase tracking-wide text-gold mb-1">Send Message via Bot</h2>
          <p className="text-sm text-muted-foreground mb-3">Sends a direct Telegram message to this user right now.</p>
          <form onSubmit={handleSendMessage} className="space-y-3">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Write a message..."
              className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
            />
            <Button
              type="submit"
              disabled={sendingMessage || !messageText.trim()}
              className="w-full bg-patriot-red text-white font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-60"
            >
              {sendingMessage ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </Card>

        <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5 mb-6">
          <h2 className="font-bold uppercase tracking-wide text-gold mb-1">Documents</h2>
          <p className="text-sm text-muted-foreground mb-3">Upload a file for this user to see (with preview) in their wallet app.</p>
          <form onSubmit={handleUploadDoc} className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              type="file"
              onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white file:text-gold"
            />
            <Input
              value={docNote}
              onChange={(e) => setDocNote(e.target.value)}
              placeholder="Note (optional)"
              className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white sm:max-w-[220px]"
            />
            <Button
              type="submit"
              disabled={uploadingDoc || !docFile}
              className="bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-60 whitespace-nowrap"
            >
              <Upload className="w-4 h-4 mr-1.5" />
              {uploadingDoc ? "Uploading..." : "Upload"}
            </Button>
          </form>

          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => {
                const fileUrl = `/api/admin/documents/${doc.id}/file`;
                const isImage = doc.mime_type.startsWith("image/");
                return (
                  <div key={doc.id} className="bg-navy rounded-xl p-3 flex items-start gap-3">
                    {isImage ? (
                      <a href={fileUrl} target="_blank" rel="noreferrer" className="shrink-0">
                        <img src={fileUrl} alt={doc.file_name} className="w-14 h-14 rounded-lg object-cover border border-[#1a3a6e]" />
                      </a>
                    ) : (
                      <a href={fileUrl} target="_blank" rel="noreferrer" className="shrink-0 w-14 h-14 rounded-lg bg-card-navy border border-[#1a3a6e] flex items-center justify-center">
                        <FileText className="w-6 h-6 text-gold" />
                      </a>
                    )}
                    <div className="min-w-0 flex-1">
                      <a href={fileUrl} target="_blank" rel="noreferrer" className="text-sm text-white font-medium truncate block hover:text-gold">
                        {doc.file_name}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {formatDocSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                      {doc.note && <p className="text-xs text-gray-400 mt-1">{doc.note}</p>}
                    </div>
                    <button onClick={() => handleDeleteDoc(doc.id)} className="shrink-0 text-muted-foreground hover:text-patriot-red">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5">
            <h2 className="font-bold uppercase tracking-wide text-gold mb-3">Transactions</h2>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.map((t) => (
                  <div key={t.id} className="text-sm bg-navy rounded-lg p-3">
                    <div className="flex justify-between">
                      <span className="capitalize font-medium text-white">{t.type}</span>
                      <span className="text-white">{Number(t.amount) !== 0 ? `${t.amount} ${t.currency}` : ""}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{new Date(t.created_at).toLocaleString()}</span>
                      <span className="capitalize">{t.status}</span>
                    </div>
                    {t.note && <p className="text-xs text-gray-400 mt-1">{t.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5">
            <h2 className="font-bold uppercase tracking-wide text-gold mb-3">Investments</h2>
            {investments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No investments yet.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {investments.map((inv) => (
                  <div key={inv.id} className="text-sm bg-navy rounded-lg p-3">
                    <div className="flex justify-between">
                      <span className="font-medium text-white">{inv.plan_name}</span>
                      <span className="capitalize text-muted-foreground">{inv.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{inv.amount} {inv.currency}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {isSuperAdmin && (
          <Card className="bg-card-navy border-patriot-red/40 rounded-2xl p-5 mt-6">
            <h2 className="font-bold uppercase tracking-wide text-patriot-red mb-1">Danger Zone</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently deletes this user and all their balances, transactions, investments, withdrawals, and
              documents. They can then open the bot and sign up again as a brand-new user — starting over from the
              notifications and phone-number prompts.
            </p>
            <Button
              onClick={handleDeleteUser}
              disabled={deleting}
              variant="outline"
              className={`font-bold uppercase tracking-wide disabled:opacity-60 ${
                confirmDelete
                  ? "bg-patriot-red text-white border-patriot-red hover:brightness-95"
                  : "border-patriot-red text-patriot-red hover:bg-patriot-red/10"
              }`}
            >
              <UserX className="w-4 h-4 mr-1.5" />
              {deleting ? "Deleting..." : confirmDelete ? "Confirm Delete — This Cannot Be Undone" : "Delete User"}
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
