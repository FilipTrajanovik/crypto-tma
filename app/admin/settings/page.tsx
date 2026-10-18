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
  const [paymentLink, setPaymentLink] = useState("");
  const [canEditGlobal, setCanEditGlobal] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
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
      const mine = data.mine;
      setFeeType(mine?.withdrawalFeeType === "fixed" || mine?.withdrawalFeeType === "percent" ? mine.withdrawalFeeType : "none");
      setFeeValue(mine?.withdrawalFeeValue ? String(Number(mine.withdrawalFeeValue)) : "");
      setPaymentLink(mine?.paymentLink || "");
      setCanEditGlobal(data.canEditGlobal !== false);
      setIsOwner(data.isOwner === true);
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
        body: JSON.stringify({
          ...(canEditGlobal ? { supportContact, btcAddress, ethAddress } : {}),
          withdrawalFeeType: feeType,
          withdrawalFeeValue: feeValue,
          paymentLink,
        }),
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
        <h1 className="text-xl font-bold uppercase tracking-widest text-brand mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Withdrawal fee and payment link apply only to the clients you claimed. The rest are platform-wide defaults.
        </p>

        <Card className="bg-card-navy border-line rounded-2xl p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-xs uppercase tracking-widest text-brand">{isOwner ? "Default for unclaimed clients" : "My clients"}</p>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Withdrawal Fee</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Applies to new withdrawal requests from your clients and is taken out of the amount the client receives. A fixed fee
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

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Release Payment Link</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Your clients see a Pay Fee button on the Release Funds screen only when this is set. You can still set a
                different link on one client&apos;s Release tab.
              </p>
              <Input
                type="url"
                value={paymentLink}
                onChange={(e) => setPaymentLink(e.target.value)}
                placeholder="https://..."
                className="bg-navy border-line focus-visible:border-brand text-white"
              />
            </div>


            <p className="text-xs uppercase tracking-widest text-brand pt-2">Platform defaults</p>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Default Support Contact</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Telegram username (or full t.me link) used when a user has no claiming admin and no personal override.
              </p>
              <Input
                value={supportContact}
                onChange={(e) => setSupportContact(e.target.value)}
                placeholder="e.g. cryptowallet_support"
                disabled={!canEditGlobal}
                className="bg-navy border-line focus-visible:border-brand text-white"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Default BTC Deposit Address</Label>
              <Input
                value={btcAddress}
                onChange={(e) => setBtcAddress(e.target.value)}
                placeholder="bc1q..."
                disabled={!canEditGlobal}
                className="bg-navy border-line focus-visible:border-brand text-white font-mono"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Default ETH Deposit Address</Label>
              <Input
                value={ethAddress}
                onChange={(e) => setEthAddress(e.target.value)}
                placeholder="0x..."
                disabled={!canEditGlobal}
                className="bg-navy border-line focus-visible:border-brand text-white font-mono"
              />
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
