"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/components/AdminNav";

type Plan = {
  id: number;
  name: string;
  description: string | null;
  min_amount: string;
  roi_percent: string;
  duration_days: number;
  currency: string;
  is_active: boolean;
};

const EMPTY_FORM = { name: "", description: "", minAmount: "", roiPercent: "", durationDays: "", currency: "USD" };

export default function AdminPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/plans");
    if (res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setPlans(data.plans);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description || "",
      minAmount: plan.min_amount,
      roiPercent: plan.roi_percent,
      durationDays: String(plan.duration_days),
      currency: plan.currency,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        minAmount: Number(form.minAmount),
        roiPercent: Number(form.roiPercent),
        durationDays: Number(form.durationDays),
        currency: form.currency,
      };

      if (editingId) {
        await fetch("/api/admin/plans", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        await fetch("/api/admin/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/admin/plans?id=${id}`, { method: "DELETE" });
    load();
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
      <main className="max-w-4xl mx-auto px-5 py-6">
        <h1 className="text-xl font-semibold mb-6">Investment Plans</h1>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-5 border border-white/5 space-y-4 mb-8">
          <h2 className="font-semibold">{editingId ? "Edit Plan" : "New Plan"}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted block mb-1.5">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
              >
                <option value="USD">USD</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">Min Amount</label>
              <input
                required
                type="number"
                step="any"
                value={form.minAmount}
                onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))}
                className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">ROI %</label>
              <input
                required
                type="number"
                step="any"
                value={form.roiPercent}
                onChange={(e) => setForm((f) => ({ ...f, roiPercent: e.target.value }))}
                className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">Duration (days)</label>
              <input
                required
                type="number"
                value={form.durationDays}
                onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
                className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-accent hover:bg-accent-dark disabled:opacity-60 transition-colors text-navy font-semibold px-5 py-2.5 rounded-xl text-sm"
            >
              {saving ? "Saving..." : editingId ? "Update Plan" : "Create Plan"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-white/10 hover:bg-white/15 transition-colors font-semibold px-5 py-2.5 rounded-xl text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-card rounded-2xl p-4 border border-white/5">
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold">
                  {plan.name}{" "}
                  {!plan.is_active && <span className="text-xs text-danger">(inactive)</span>}
                </p>
                <span className="text-accent font-semibold text-sm">{plan.roi_percent}% ROI</span>
              </div>
              {plan.description && <p className="text-sm text-muted mb-2">{plan.description}</p>}
              <div className="flex gap-4 text-xs text-muted mb-3">
                <span>Min: {plan.min_amount} {plan.currency}</span>
                <span>{plan.duration_days} days</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(plan)}
                  className="text-xs bg-white/10 hover:bg-white/15 transition-colors px-3 py-1.5 rounded-lg"
                >
                  Edit
                </button>
                {plan.is_active && (
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="text-xs bg-danger/15 hover:bg-danger/25 text-danger transition-colors px-3 py-1.5 rounded-lg"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
