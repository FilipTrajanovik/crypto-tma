"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/components/AdminNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

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
      toast.add({ title: editingId ? "Condition updated" : "Condition created", type: "success" });
      resetForm();
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/admin/release?id=${id}`, { method: "DELETE" });
    toast.add({ title: "Condition deactivated", type: "success" });
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy">
        <AdminNav />
        <main className="max-w-4xl mx-auto px-5 py-6">
          <Skeleton className="h-96 w-full rounded-2xl bg-card-navy" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy">
      <AdminNav />
      <main className="max-w-4xl mx-auto px-5 py-6">
        <h1 className="text-xl font-bold uppercase tracking-widest text-gold mb-6">Release Conditions</h1>

        <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-bold uppercase tracking-wide text-white">{editingId ? "Edit Condition" : "New Condition"}</h2>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Title</Label>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Fee Amount</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.feeAmount}
                  onChange={(e) => setForm((f) => ({ ...f, feeAmount: e.target.value }))}
                  className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Fee Currency</Label>
                <Select value={form.feeCurrency} onValueChange={(v) => v && setForm((f) => ({ ...f, feeCurrency: v }))}>
                  <SelectTrigger className="bg-navy border-[#1a3a6e] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card-navy border-[#1a3a6e] text-white">
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="BTC">BTC</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={saving}
                className="bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId ? "Update Condition" : "Create Condition"}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm} className="font-bold uppercase tracking-wide">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        <div className="space-y-3">
          {conditions.map((c) => (
            <Card key={c.id} className="bg-card-navy border-[#1a3a6e] rounded-2xl p-4">
              <div className="flex justify-between items-start mb-1">
                <p className="font-bold text-white uppercase">
                  {c.title} {!c.is_active && <span className="text-xs text-patriot-red normal-case">(inactive)</span>}
                </p>
                <span className="text-patriot-red font-bold text-sm">
                  {Number(c.fee_amount)} {c.fee_currency}
                </span>
              </div>
              {c.description && <p className="text-sm text-muted-foreground mb-3">{c.description}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(c)} className="border-gold text-gold hover:bg-gold/10">
                  Edit
                </Button>
                {c.is_active && (
                  <Button size="sm" variant="outline" onClick={() => handleDelete(c.id)} className="border-patriot-red text-patriot-red hover:bg-patriot-red/10">
                    Deactivate
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
