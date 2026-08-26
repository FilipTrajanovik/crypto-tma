"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
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
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/wallet/invest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan.id, amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Investment failed" });
      } else {
        setMessage({ type: "success", text: "Investment created successfully." });
        setAmount("");
        setSelectedPlan(null);
        load();
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Try again." });
    } finally {
      setSubmitting(false);
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
    <div className="min-h-screen px-5 pt-6 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wallet" className="text-muted text-xl leading-none">←</Link>
        <h1 className="text-xl font-semibold">Invest</h1>
      </div>

      {!releasePaid ? (
        <div className="bg-card rounded-2xl p-6 border border-white/5 text-center mb-6">
          <div className="text-4xl mb-3">🔒</div>
          <p className="font-semibold mb-2">Investment plans are locked</p>
          <p className="text-sm text-muted mb-5 leading-relaxed">
            Investment plans unlock once your release fee has been paid and confirmed. Head to Release Funds to see
            what&apos;s required.
          </p>
          <Link
            href="/wallet/release"
            className="inline-block bg-accent hover:bg-accent-dark transition-colors text-navy font-semibold px-6 py-2.5 rounded-xl text-sm"
          >
            Go to Release Funds
          </Link>
        </div>
      ) : (
      <>
      <h2 className="text-sm font-semibold text-muted mb-3">Available Plans</h2>
      <div className="space-y-3 mb-6">
        {plans.length === 0 && <p className="text-muted text-sm">No active investment plans right now.</p>}
        {plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan)}
            className={`w-full text-left bg-card rounded-2xl p-4 border transition-colors ${
              selectedPlan?.id === plan.id ? "border-accent" : "border-white/5"
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <p className="font-semibold">{plan.name}</p>
              <span className="text-accent font-semibold text-sm">{plan.roi_percent}% ROI</span>
            </div>
            {plan.description && <p className="text-xs text-muted mb-2">{plan.description}</p>}
            <div className="flex gap-4 text-xs text-muted">
              <span>Min: {plan.min_amount} {plan.currency}</span>
              <span>{plan.duration_days} days</span>
            </div>
          </button>
        ))}
      </div>

      {selectedPlan && (
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-5 border border-white/5 space-y-4 mb-6">
          <p className="text-sm">
            Investing in <span className="font-semibold">{selectedPlan.name}</span>
          </p>
          <div>
            <label className="text-xs text-muted block mb-1.5">Amount ({selectedPlan.currency})</label>
            <input
              type="number"
              step="any"
              min={selectedPlan.min_amount}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min ${selectedPlan.min_amount}`}
              className="w-full bg-navy border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-accent" : "text-danger"}`}>{message.text}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent hover:bg-accent-dark disabled:opacity-60 transition-colors text-navy font-semibold py-3 rounded-xl text-sm"
          >
            {submitting ? "Submitting..." : "Confirm Investment"}
          </button>
        </form>
      )}
      </>
      )}

      <h2 className="text-sm font-semibold text-muted mb-3">Your Investments</h2>
      {investments.length === 0 ? (
        <p className="text-muted text-sm text-center py-6">No investments yet.</p>
      ) : (
        <div className="space-y-3">
          {investments.map((inv) => (
            <div key={inv.id} className="bg-card rounded-xl p-4 border border-white/5">
              <div className="flex justify-between items-start mb-1">
                <p className="font-medium">{inv.plan_name}</p>
                <span className="text-xs px-2 py-1 rounded-full bg-accent/15 text-accent capitalize">{inv.status}</span>
              </div>
              <p className="text-sm text-muted">
                {inv.amount} {inv.currency} · {inv.roi_percent}% ROI
              </p>
              <p className="text-xs text-muted mt-1">
                Started {new Date(inv.started_at).toLocaleDateString()}
                {inv.matures_at && ` · Matures ${new Date(inv.matures_at).toLocaleDateString()}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
