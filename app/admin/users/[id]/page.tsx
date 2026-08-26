"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/app/components/AdminNav";

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
    release_paid: boolean;
    support_contact: string | null;
    created_at: string;
  };
  balance: { btc_amount: string; eth_amount: string; usd_cash: string };
  transactions: { id: number; type: string; amount: string; currency: string; status: string; note: string | null; created_at: string }[];
  investments: { id: number; amount: string; currency: string; status: string; plan_name: string; started_at: string; matures_at: string | null }[];
  withdrawals: { id: number; amount: string; currency: string; wallet_address: string; status: string; created_at: string }[];
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<UserDetail | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [btcAmount, setBtcAmount] = useState("");
  const [ethAmount, setEthAmount] = useState("");
  const [usdCash, setUsdCash] = useState("");
  const [note, setNote] = useState("");
  const [supportContact, setSupportContact] = useState("");
  const [messageText, setMessageText] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageSent, setMessageSent] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [whoamiRes, res] = await Promise.all([fetch("/api/admin/whoami"), fetch(`/api/admin/users/${id}`)]);

    if (whoamiRes.status === 401 || res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (whoamiRes.ok) {
      const identity = await whoamiRes.json();
      setIsSuperAdmin(identity.isSuperAdmin);
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
      setSupportContact(json.user.support_contact || "");
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          btcAmount: Number(btcAmount),
          ethAmount: Number(ethAmount),
          usdCash: Number(usdCash),
          note: note || undefined,
        }),
      });
      if (res.ok) {
        setMessage("Balance updated.");
        setNote("");
        load();
      } else {
        setMessage("Failed to update balance.");
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

  const toggleReleasePaid = async () => {
    if (!data) return;
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releasePaid: !data.user.release_paid }),
    });
    load();
  };

  const handleSaveSupportContact = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supportContact }),
      });
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setSendingMessage(true);
    setMessageSent(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: messageText }),
      });
      if (res.ok) {
        setMessageSent("Message sent.");
        setMessageText("");
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessageSent(data.error || "Failed to send message.");
      }
    } finally {
      setSendingMessage(false);
    }
  };

  if (forbidden) {
    return (
      <div className="min-h-screen">
        <AdminNav />
        <main className="max-w-4xl mx-auto px-5 py-6 text-center">
          <p className="text-danger font-semibold mb-2">You haven&apos;t claimed this user</p>
          <p className="text-sm text-muted mb-4">Search for them by exact name or phone on the dashboard to claim them first.</p>
          <Link href="/admin/dashboard" className="text-accent text-sm">← Back to dashboard</Link>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { user, transactions, investments, withdrawals } = data;
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Unnamed User";

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="max-w-4xl mx-auto px-5 py-6">
        <Link href="/admin/dashboard" className="text-muted text-sm mb-4 inline-block">← Back to dashboard</Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-semibold">{displayName}</h1>
            <p className="text-sm text-muted">
              {user.username ? `@${user.username}` : "no username"} · Telegram ID {user.telegram_id} · {user.phone || "no phone"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={toggleActive}
              className={`text-xs px-3 py-1.5 rounded-full ${user.is_active ? "bg-accent/15 text-accent" : "bg-danger/15 text-danger"}`}
            >
              {user.is_active ? "Active" : "Inactive"} — toggle
            </button>
            {isSuperAdmin && (
              <button
                onClick={toggleAdmin}
                className={`text-xs px-3 py-1.5 rounded-full ${user.is_admin ? "bg-accent/15 text-accent" : "bg-white/10 text-muted"}`}
              >
                {user.is_admin ? "Admin" : "Not admin"} — toggle
              </button>
            )}
            <button
              onClick={toggleReleasePaid}
              className={`text-xs px-3 py-1.5 rounded-full ${user.release_paid ? "bg-accent/15 text-accent" : "bg-white/10 text-muted"}`}
            >
              {user.release_paid ? "Release paid" : "Release unpaid"} — toggle
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <form onSubmit={handleSaveBalance} className="bg-card rounded-2xl p-5 border border-white/5 space-y-4">
            <h2 className="font-semibold">Edit Balance</h2>
            <div>
              <label className="text-xs text-muted block mb-1.5">BTC Amount</label>
              <input
                type="number"
                step="any"
                value={btcAmount}
                onChange={(e) => setBtcAmount(e.target.value)}
                className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">ETH Amount</label>
              <input
                type="number"
                step="any"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
                className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">USD Cash</label>
              <input
                type="number"
                step="any"
                value={usdCash}
                onChange={(e) => setUsdCash(e.target.value)}
                className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for adjustment"
                className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            {message && <p className="text-sm text-accent">{message}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-accent hover:bg-accent-dark disabled:opacity-60 transition-colors text-navy font-semibold py-2.5 rounded-xl text-sm"
            >
              {saving ? "Saving..." : "Save Balance"}
            </button>
          </form>

          <div className="bg-card rounded-2xl p-5 border border-white/5">
            <h2 className="font-semibold mb-3">Add Manual Note</h2>
            <p className="text-sm text-muted mb-4">Log a note without changing the balance.</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write a note..."
              rows={4}
              className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent mb-3"
            />
            <button
              onClick={handleAddNote}
              disabled={saving || !note.trim()}
              className="w-full bg-white/10 hover:bg-white/15 disabled:opacity-60 transition-colors font-semibold py-2.5 rounded-xl text-sm"
            >
              Add Note
            </button>

            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2">Withdrawal Requests</h3>
              {withdrawals.length === 0 ? (
                <p className="text-xs text-muted">None yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {withdrawals.map((w) => (
                    <div key={w.id} className="text-xs bg-navy rounded-lg p-2 flex justify-between">
                      <span>{w.amount} {w.currency}</span>
                      <span className="capitalize text-muted">{w.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card rounded-2xl p-5 border border-white/5">
            <h2 className="font-semibold mb-1">Support Contact Override</h2>
            <p className="text-sm text-muted mb-3">
              Telegram username shown as this user&apos;s Contact Support. Leave blank to use you (once claimed) or the
              platform default.
            </p>
            <div className="flex gap-2">
              <input
                value={supportContact}
                onChange={(e) => setSupportContact(e.target.value)}
                placeholder="e.g. your_telegram_username"
                className="flex-1 bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
              <button
                onClick={handleSaveSupportContact}
                disabled={saving}
                className="bg-white/10 hover:bg-white/15 disabled:opacity-60 transition-colors font-semibold px-4 py-2.5 rounded-xl text-sm whitespace-nowrap"
              >
                Save
              </button>
            </div>
          </div>

          <form onSubmit={handleSendMessage} className="bg-card rounded-2xl p-5 border border-white/5">
            <h2 className="font-semibold mb-1">Send Message via Bot</h2>
            <p className="text-sm text-muted mb-3">Sends a direct Telegram message to this user right now.</p>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Write a message..."
              rows={3}
              className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent mb-3"
            />
            {messageSent && <p className="text-sm text-accent mb-3">{messageSent}</p>}
            <button
              type="submit"
              disabled={sendingMessage || !messageText.trim()}
              className="w-full bg-accent hover:bg-accent-dark disabled:opacity-60 transition-colors text-navy font-semibold py-2.5 rounded-xl text-sm"
            >
              {sendingMessage ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl p-5 border border-white/5">
            <h2 className="font-semibold mb-3">Transactions</h2>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted">No transactions yet.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.map((t) => (
                  <div key={t.id} className="text-sm bg-navy rounded-lg p-3">
                    <div className="flex justify-between">
                      <span className="capitalize font-medium">{t.type}</span>
                      <span>{Number(t.amount) !== 0 ? `${t.amount} ${t.currency}` : ""}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted mt-1">
                      <span>{new Date(t.created_at).toLocaleString()}</span>
                      <span className="capitalize">{t.status}</span>
                    </div>
                    {t.note && <p className="text-xs text-gray-400 mt-1">{t.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl p-5 border border-white/5">
            <h2 className="font-semibold mb-3">Investments</h2>
            {investments.length === 0 ? (
              <p className="text-sm text-muted">No investments yet.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {investments.map((inv) => (
                  <div key={inv.id} className="text-sm bg-navy rounded-lg p-3">
                    <div className="flex justify-between">
                      <span className="font-medium">{inv.plan_name}</span>
                      <span className="capitalize text-muted">{inv.status}</span>
                    </div>
                    <p className="text-xs text-muted mt-1">{inv.amount} {inv.currency}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
