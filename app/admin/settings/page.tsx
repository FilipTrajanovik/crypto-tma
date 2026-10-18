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
  const [feeType, setFeeType] = useState<"none" | "fixed" | "percent">("none");
  const [feeValue, setFeeValue] = useState("");
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
      setFeeType(data.settings?.withdrawal_fee_type === "fixed" || data.settings?.withdrawal_fee_type === "percent" ? data.settings.withdrawal_fee_type : "none");
      setFeeValue(data.settings?.withdrawal_fee_value ? String(Number(data.settings.withdrawal_fee_value)) : "");
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
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supportContact, btcAddress, ethAddress, withdrawalFeeType: feeType, withdrawalFeeValue: feeValue }),
      });
      if (res.ok) {
        toast.add({ title: "Settings saved", type: "success" });
      } else {
        const body = await res.json().catch(() => ({}));
        toast.add({ title: body.error || "Could not save settings", type: "error" });
      }
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
        <h1 className="text-xl font-bold uppercase tracking-widest text-brand mb-2">Platform Settings</h1>
        <p className="text-sm text-muted-foreground mb-6">
          These apply platform-wide. A user&apos;s claiming admin (or a manual override on their profile) takes
          priority over the defaults below.
        </p>

        <Card className="bg-card-navy border-line rounded-2xl p-5">
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
                className="bg-navy border-line focus-visible:border-brand text-white"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Default BTC Deposit Address</Label>
              <Input
                value={btcAddress}
                onChange={(e) => setBtcAddress(e.target.value)}
                placeholder="bc1q..."
                className="bg-navy border-line focus-visible:border-brand text-white font-mono"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Default ETH Deposit Address</Label>
              <Input
                value={ethAddress}
                onChange={(e) => setEthAddress(e.target.value)}
                placeholder="0x..."
                className="bg-navy border-line focus-visible:border-brand text-white font-mono"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Withdrawal Fee</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Applies to every new withdrawal request and is taken out of the amount the client receives. A fixed fee
                is in USD and is converted at the current price for BTC, ETH and gold. You can still change the fee on
                an individual pending request.
              </p>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {(["none", "fixed", "percent"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFeeType(t)}
                    className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
                      feeType === t ? "bg-brand text-navy" : "bg-navy border border-line text-muted-foreground"
                    }`}
                  >
                    {t === "none" ? "No fee" : t === "fixed" ? "Fixed ($)" : "Percent (%)"}
                  </button>
                ))}
              </div>
              {feeType !== "none" && (
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max={feeType === "percent" ? 99.99 : undefined}
                  value={feeValue}
                  onChange={(e) => setFeeValue(e.target.value)}
                  placeholder={feeType === "fixed" ? "e.g. 25 (USD)" : "e.g. 2.5 (%)"}
                  className="bg-navy border-line focus-visible:border-brand text-white"
                />
              )}
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="bg-brand text-navy font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
