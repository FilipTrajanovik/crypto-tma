"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/app/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { Lock } from "lucide-react";

type Withdrawal = {
  id: number;
  amount: string;
  currency: string;
  status: string;
  admin_note: string | null;
  created_at: string;
};

type Currency = "USD" | "BTC" | "ETH" | "GOLD";

const CURRENCIES: { value: Currency; label: string; decimals: number }[] = [
  { value: "USD", label: "USD Cash", decimals: 2 },
  { value: "BTC", label: "Bitcoin", decimals: 8 },
  { value: "ETH", label: "Ethereum", decimals: 6 },
  { value: "GOLD", label: "Gold (oz)", decimals: 4 },
];

const PERCENT_STOPS = [25, 50, 75, 100];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-gold/15 text-gold border-gold/30",
    approved: "bg-green-500/15 text-green-400 border-green-500/30",
    completed: "bg-green-500/15 text-green-400 border-green-500/30",
    rejected: "bg-patriot-red/15 text-patriot-red border-patriot-red/30",
  };
  return (
    <Badge variant="outline" className={`capitalize ${styles[status] || "bg-white/10 text-muted-foreground"}`}>
      {status}
    </Badge>
  );
}

export default function WithdrawPage() {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [amount, setAmount] = useState("");
  const [percent, setPercent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [releasePaid, setReleasePaid] = useState(false);
  const [balances, setBalances] = useState<Record<Currency, number>>({ USD: 0, BTC: 0, ETH: 0, GOLD: 0 });
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [balanceRes, withdrawRes] = await Promise.all([fetch("/api/wallet/balance"), fetch("/api/wallet/withdraw")]);
    if (balanceRes.ok) {
      const data = await balanceRes.json();
      setReleasePaid(data.user.releasePaid === true);
      setBalances({ USD: data.balance.usdCash, BTC: data.balance.btc, ETH: data.balance.eth, GOLD: data.balance.gold });
    }
    if (withdrawRes.ok) {
      const data = await withdrawRes.json();
      setWithdrawals(data.withdrawals);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 30_000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const meta = CURRENCIES.find((c) => c.value === currency)!;
  const available = balances[currency];

  const applyPercent = (p: number) => {
    setPercent(p);
    setAmount(available > 0 ? ((available * p) / 100).toFixed(meta.decimals) : "0");
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyPercent(Number(e.target.value));
  };

  const handleCurrencyChange = (c: Currency) => {
    setCurrency(c);
    setPercent(0);
    setAmount("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), currency }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.add({ title: data.error || "Withdrawal request failed", type: "error" });
      } else {
        toast.add({ title: "Withdrawal request submitted", type: "success" });
        setAmount("");
        setPercent(0);
        loadAll();
      }
    } catch {
      toast.add({ title: "Something went wrong. Try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy px-5 pt-6 pb-10 max-w-md mx-auto">
      <PageHeader title="Withdrawal Request" />

      {loading ? (
        <Skeleton className="h-56 w-full rounded-2xl bg-card-navy mb-8" />
      ) : (
        <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5 mb-8">
          {!releasePaid && (
            <div className="flex items-center gap-2 bg-patriot-red/10 border border-patriot-red/30 rounded-xl px-4 py-3 mb-4">
              <Lock className="w-4 h-4 text-patriot-red shrink-0" />
              <p className="text-sm text-patriot-red">Withdrawals unlock once your release fee is paid.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Currency</Label>
              <div className="grid grid-cols-4 gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    disabled={!releasePaid}
                    onClick={() => handleCurrencyChange(c.value)}
                    className={`h-9 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50 ${
                      currency === c.value ? "bg-gold text-navy" : "bg-navy border border-[#1a3a6e] text-muted-foreground"
                    }`}
                  >
                    {c.value}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-muted-foreground block">Amount ({currency})</Label>
                <span className="text-xs text-muted-foreground">
                  Available: {available.toLocaleString(undefined, { maximumFractionDigits: meta.decimals })} {currency}
                </span>
              </div>
              <Input
                type="number"
                step="any"
                min="0"
                required
                disabled={!releasePaid}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setPercent(available > 0 ? Math.min(100, Math.round((Number(e.target.value) / available) * 100)) : 0);
                }}
                placeholder="0.00"
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
              />
            </div>

            <div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={percent}
                onChange={handleSliderChange}
                disabled={!releasePaid || available <= 0}
                className="w-full accent-gold disabled:opacity-50"
              />
              <div className="grid grid-cols-4 gap-2 mt-2">
                {PERCENT_STOPS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={!releasePaid || available <= 0}
                    onClick={() => applyPercent(p)}
                    className={`h-8 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50 ${
                      percent === p ? "bg-gold text-navy" : "bg-navy border border-[#1a3a6e] text-muted-foreground"
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || !releasePaid}
              className="w-full bg-patriot-red text-white font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </form>
        </Card>
      )}

      <h2 className="text-sm font-bold uppercase tracking-widest text-gold border-b border-gold/30 pb-2 mb-4">
        Your Requests
      </h2>

      {loading ? (
        <Skeleton className="h-32 w-full rounded-2xl bg-card-navy" />
      ) : withdrawals.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No withdrawal requests yet</p>
      ) : (
        <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-[#1a3a6e] hover:bg-transparent">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Amount</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((w) => (
                <TableRow key={w.id} className="border-[#1a3a6e]">
                  <TableCell className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-white font-medium">
                    {w.currency === "USD" ? `$${Number(w.amount).toFixed(2)}` : `${Number(w.amount)} ${w.currency}`}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={w.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{w.admin_note || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
