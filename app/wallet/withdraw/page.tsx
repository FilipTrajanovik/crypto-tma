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
import { computeFeeAmount, type FeeConfig } from "@/lib/fee-calc";

type Withdrawal = {
  id: number;
  amount: string;
  currency: string;
  status: string;
  admin_note: string | null;
  fee_amount?: string;
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
    pending: "bg-brand/15 text-brand border-brand/30",
    approved: "bg-verified/15 text-verified-bright border-verified/30",
    completed: "bg-verified/15 text-verified-bright border-verified/30",
    rejected: "bg-patriot-red/15 text-patriot-red border-patriot-red/30",
  };
  return (
    <Badge variant="outline" className={`capitalize ${styles[status] || "bg-white/5 text-muted-foreground border-line"}`}>
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
  const [feeConfig, setFeeConfig] = useState<FeeConfig>({ type: null, value: 0 });
  const [rates, setRates] = useState({ btc: 0, eth: 0, gold: 0 });
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
      if (data.feeConfig) setFeeConfig(data.feeConfig);
      if (data.rates) setRates({ btc: data.rates.BTC, eth: data.rates.ETH, gold: data.rates.GOLD });
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

  // Same maths the server uses. The server recalculates the real fee when the
  // request is created; nothing is shown when the fee is zero.
  const amountNum = Number(amount);
  const feeAmount = amountNum > 0 ? computeFeeAmount(amountNum, currency, feeConfig, rates) : 0;
  const feeTooHigh = feeAmount > 0 && feeAmount >= amountNum;
  const fmtAmount = (n: number) => (currency === "USD" ? `$${n.toFixed(2)}` : `${n} ${currency}`);

  const hasFees = withdrawals.some((w) => Number(w.fee_amount) > 0);

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
        <Card className="bg-card-navy border-line rounded-2xl p-5 mb-8">
          {!releasePaid && (
            <div className="flex items-center gap-2 bg-patriot-red/10 border border-patriot-red/30 rounded-xl px-4 py-3 mb-4">
              <Lock className="w-4 h-4 text-patriot-red shrink-0" />
              <p className="text-sm text-patriot-red">Withdrawals unlock once your release fee is paid.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-[13px] text-muted-foreground mb-1.5 block">Currency</Label>
              <div className="grid grid-cols-4 gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    disabled={!releasePaid}
                    onClick={() => handleCurrencyChange(c.value)}
                    className={`h-10 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50 ${
                      currency === c.value ? "bg-brand text-navy" : "bg-navy border border-line text-muted-foreground"
                    }`}
                  >
                    {c.value}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-[13px] text-muted-foreground block">Amount ({currency})</Label>
                <span className="text-[13px] text-muted-foreground tabular-nums">
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
                className="bg-navy border-line focus-visible:border-brand text-white"
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
                className="w-full accent-brand disabled:opacity-50"
              />
              <div className="grid grid-cols-4 gap-2 mt-2">
                {PERCENT_STOPS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={!releasePaid || available <= 0}
                    onClick={() => applyPercent(p)}
                    className={`h-9 rounded-lg text-[13px] font-semibold tabular-nums transition-colors disabled:opacity-50 ${
                      percent === p ? "bg-brand text-navy" : "bg-navy border border-line text-muted-foreground"
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            {feeAmount > 0 && (
              <div className="space-y-1.5 border-t border-line pt-3 text-sm tabular-nums">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Fee{feeConfig.type === "percent" ? ` (${feeConfig.value}%)` : ""}
                  </span>
                  <span className="text-white">− {fmtAmount(feeAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground font-normal">You receive</span>
                  <span className="text-white">{feeTooHigh ? "—" : fmtAmount(amountNum - feeAmount)}</span>
                </div>
                {feeTooHigh && <p className="text-xs text-patriot-red">Amount is too small to cover the fee.</p>}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || !releasePaid || feeTooHigh}
              className="w-full h-12 text-base bg-patriot-red text-white font-semibold hover:brightness-95 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </form>
        </Card>
      )}

      <h2 className="text-sm font-semibold text-brand border-b border-brand/30 pb-2 mb-4">
        Your Requests
      </h2>

      {loading ? (
        <Skeleton className="h-32 w-full rounded-2xl bg-card-navy" />
      ) : withdrawals.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No withdrawal requests yet</p>
      ) : (
        <Card className="bg-card-navy border-line rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-line hover:bg-transparent">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Amount</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                {hasFees && <TableHead className="text-muted-foreground">Fee</TableHead>}
                <TableHead className="text-muted-foreground">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((w) => (
                <TableRow key={w.id} className="border-line">
                  <TableCell className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-white font-medium tabular-nums">
                    {w.currency === "USD" ? `$${Number(w.amount).toFixed(2)}` : `${Number(w.amount)} ${w.currency}`}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={w.status} />
                  </TableCell>
                  {hasFees && (
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {Number(w.fee_amount) > 0
                      ? w.currency === "USD"
                        ? `$${Number(w.fee_amount).toFixed(2)}`
                        : `${Number(w.fee_amount)} ${w.currency}`
                      : "—"}
                  </TableCell>
                  )}
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
