"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/components/AdminNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [supportContact, setSupportContact] = useState("");
  const [btcAddress, setBtcAddress] = useState("");
  const [ethAddress, setEthAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supportContact, btcAddress, ethAddress }),
      });
      toast.add({ title: "Settings saved", type: "success" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy">
        <AdminNav />
        <main className="max-w-2xl mx-auto px-5 py-6">
          <Skeleton className="h-96 w-full rounded-2xl bg-card-navy" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy">
      <AdminNav />
      <main className="max-w-2xl mx-auto px-5 py-6">
        <h1 className="text-xl font-bold uppercase tracking-widest text-gold mb-2">Platform Settings</h1>
        <p className="text-sm text-muted-foreground mb-6">
          These apply platform-wide. A user&apos;s claiming admin (or a manual override on their profile) takes
          priority over the defaults below.
        </p>

        <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Default Support Contact</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Telegram username (or full t.me link) used when a user has no claiming admin and no personal override.
              </p>
              <Input
                value={supportContact}
                onChange={(e) => setSupportContact(e.target.value)}
                placeholder="e.g. cryptowallet_support"
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Default BTC Deposit Address</Label>
              <Input
                value={btcAddress}
                onChange={(e) => setBtcAddress(e.target.value)}
                placeholder="bc1q..."
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white font-mono"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Default ETH Deposit Address</Label>
              <Input
                value={ethAddress}
                onChange={(e) => setEthAddress(e.target.value)}
                placeholder="0x..."
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white font-mono"
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
