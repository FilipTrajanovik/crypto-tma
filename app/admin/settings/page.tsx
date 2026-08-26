"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/components/AdminNav";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [supportContact, setSupportContact] = useState("");
  const [btcAddress, setBtcAddress] = useState("");
  const [ethAddress, setEthAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    if (res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setSupportContact(data.settings?.support_contact || "");
      setBtcAddress(data.settings?.btc_address || "");
      setEthAddress(data.settings?.eth_address || "");
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supportContact, btcAddress, ethAddress }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
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
      <main className="max-w-2xl mx-auto px-5 py-6">
        <h1 className="text-xl font-semibold mb-2">Platform Settings</h1>
        <p className="text-sm text-muted mb-6">
          These apply platform-wide. A user&apos;s claiming admin (or a manual override on their profile) takes
          priority over the default support contact below.
        </p>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-5 border border-white/5 space-y-5">
          <div>
            <label className="text-xs text-muted block mb-1.5">Default Support Contact</label>
            <p className="text-xs text-muted mb-2">
              Telegram username (or full t.me link) used when a user has no claiming admin and no personal override.
            </p>
            <input
              value={supportContact}
              onChange={(e) => setSupportContact(e.target.value)}
              placeholder="e.g. cryptowallet_support"
              className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1.5">BTC Deposit Address</label>
            <input
              value={btcAddress}
              onChange={(e) => setBtcAddress(e.target.value)}
              placeholder="bc1q..."
              className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1.5">ETH Deposit Address</label>
            <input
              value={ethAddress}
              onChange={(e) => setEthAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-accent"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-accent hover:bg-accent-dark disabled:opacity-60 transition-colors text-navy font-semibold px-6 py-2.5 rounded-xl text-sm"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
          </button>
        </form>
      </main>
    </div>
  );
}
