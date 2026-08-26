"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/components/AdminNav";

type Condition = {
  id: number;
  title: string;
  description: string | null;
  fee_amount: string;
  fee_currency: string;
  is_active: boolean;
};

const EMPTY_FORM = { title: "", description: "", feeAmount: "", feeCurrency: "USD" };

export default function AdminReleasePage() {
  const router = useRouter();
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/release");
    if (res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setConditions(data.conditions);
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

  const startEdit = (c: Condition) => {
    setEditingId(c.id);
    setForm({ title: c.title, description: c.description || "", feeAmount: c.fee_amount, feeCurrency: c.fee_currency });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        feeAmount: Number(form.feeAmount || 0),
        feeCurrency: form.feeCurrency,
      };

      if (editingId) {
        await fetch("/api/admin/release", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        await fetch("/api/admin/release", {
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
    await fetch(`/api/admin/release?id=${id}`, { method: "DELETE" });
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
        <h1 className="text-xl font-semibold mb-6">Release Conditions</h1>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-5 border border-white/5 space-y-4 mb-8">
          <h2 className="font-semibold">{editingId ? "Edit Condition" : "New Condition"}</h2>
          <div>
            <label className="text-xs text-muted block mb-1.5">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted block mb-1.5">Fee Amount</label>
              <input
                type="number"
                step="any"
                value={form.feeAmount}
                onChange={(e) => setForm((f) => ({ ...f, feeAmount: e.target.value }))}
                className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">Fee Currency</label>
              <select
                value={form.feeCurrency}
                onChange={(e) => setForm((f) => ({ ...f, feeCurrency: e.target.value }))}
                className="w-full bg-navy border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
              >
                <option value="USD">USD</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-accent hover:bg-accent-dark disabled:opacity-60 transition-colors text-navy font-semibold px-5 py-2.5 rounded-xl text-sm"
            >
              {saving ? "Saving..." : editingId ? "Update Condition" : "Create Condition"}
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
          {conditions.map((c) => (
            <div key={c.id} className="bg-card rounded-2xl p-4 border border-white/5">
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold">
                  {c.title} {!c.is_active && <span className="text-xs text-danger">(inactive)</span>}
                </p>
                <span className="text-accent font-semibold text-sm">
                  {Number(c.fee_amount)} {c.fee_currency}
                </span>
              </div>
              {c.description && <p className="text-sm text-muted mb-3">{c.description}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(c)}
                  className="text-xs bg-white/10 hover:bg-white/15 transition-colors px-3 py-1.5 rounded-lg"
                >
                  Edit
                </button>
                {c.is_active && (
                  <button
                    onClick={() => handleDelete(c.id)}
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
