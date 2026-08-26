"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/app/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { Lock } from "lucide-react";

type Plan = {
  id: number;
  name: string;
  description: string | null;
  min_amount: string;
  roi_percent: string;
  duration_days: number;
  currency: string;
};

type Investment = {
  id: number;
  amount: string;
  currency: string;
  status: string;
  started_at: string;
  matures_at: string | null;
  plan_name: string;
  roi_percent: string;
};

export default function InvestPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [releasePaid, setReleasePaid] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/wallet/invest");
    if (res.ok) {
      const data = await res.json();
      setPlans(data.plans);
      setInvestments(data.investments);
      setReleasePaid(data.releasePaid);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/wallet/invest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan.id, amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.add({ title: data.error || "Investment failed", type: "error" });
      } else {
        toast.add({ title: "Investment created successfully", type: "success" });
        setAmount("");
        setSelectedPlan(null);
        load();
      }
    } catch {
      toast.add({ title: "Something went wrong. Try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy px-5 pt-6 pb-10 max-w-md mx-auto">
      <PageHeader title="Investment Plans" subtitle="Grow your portfolio with our managed plans" />

      {loading ? (
        <div className="space-y-3 mb-6">
          <Skeleton className="h-48 w-full rounded-2xl bg-card-navy" />
          <Skeleton className="h-48 w-full rounded-2xl bg-card-navy" />
        </div>
      ) : !releasePaid ? (
        <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-6 text-center mb-6">
          <Lock className="w-8 h-8 text-gold mx-auto mb-3" />
          <p className="font-bold text-white mb-2 uppercase tracking-wide">Plans Locked</p>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Investment plans unlock once your release fee has been paid and confirmed.
          </p>
          <Link href="/wallet/release">
            <Button className="bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95">
              Go to Release Funds
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3 mb-6">
          {plans.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">No active plans available</p>}
          {plans.map((plan) => (
            <Card key={plan.id} className="bg-card-navy border-[#1a3a6e] border-t-4 border-t-gold rounded-2xl p-5">
              <p className="font-bold text-white uppercase mb-1">{plan.name}</p>
              {plan.description && <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>}
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-3xl font-bold text-gold leading-none">{plan.roi_percent}%</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">ROI</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{plan.duration_days} days</p>
                  <p className="text-sm text-white">Min: {plan.min_amount}</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-gold/15 text-gold border-gold/30 mb-4">
                {plan.currency}
              </Badge>
              <Button
                onClick={() => setSelectedPlan(plan)}
                className="w-full bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95"
              >
                Invest Now
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent className="bg-card-navy border-[#1a3a6e] text-white">
          <DialogHeader>
            <DialogTitle className="text-gold uppercase tracking-wide">Invest in {selectedPlan?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Amount ({selectedPlan?.currency})</Label>
              <Input
                type="number"
                step="any"
                min={selectedPlan?.min_amount}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min ${selectedPlan?.min_amount}`}
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95"
              >
                {submitting ? "Submitting..." : "Confirm Investment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <h2 className="text-sm font-bold uppercase tracking-widest text-gold border-b border-gold/30 pb-2 mb-4">
        Your Investments
      </h2>
      {investments.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-6">No investments yet</p>
      ) : (
        <div className="space-y-3">
          {investments.map((inv) => (
            <Card key={inv.id} className="bg-card-navy border-[#1a3a6e] rounded-xl p-4">
              <div className="flex justify-between items-start mb-1">
                <p className="font-medium text-white">{inv.plan_name}</p>
                <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/30 capitalize">
                  {inv.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {inv.amount} {inv.currency} · {inv.roi_percent}% ROI
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Started {new Date(inv.started_at).toLocaleDateString()}
                {inv.matures_at && ` · Matures ${new Date(inv.matures_at).toLocaleDateString()}`}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
