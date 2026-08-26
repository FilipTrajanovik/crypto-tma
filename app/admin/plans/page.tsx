"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/components/AdminNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { Plus } from "lucide-react";

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
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description || "",
      minAmount: plan.min_amount,
      roiPercent: plan.roi_percent,
      durationDays: String(plan.duration_days),
      currency: plan.currency,
    });
    setDialogOpen(true);
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
      toast.add({ title: editingId ? "Plan updated" : "Plan created", type: "success" });
      setDialogOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/admin/plans?id=${id}`, { method: "DELETE" });
    toast.add({ title: "Plan deactivated", type: "success" });
    load();
  };

  return (
    <div className="min-h-screen bg-navy">
      <AdminNav />
      <main className="max-w-4xl mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold uppercase tracking-widest text-gold">Investment Plans</h1>
          <Button onClick={openNew} className="bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95">
            <Plus className="w-4 h-4 mr-1" /> Add New Plan
          </Button>
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full rounded-2xl bg-card-navy" />
        ) : (
          <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#1a3a6e] hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Name</TableHead>
                    <TableHead className="text-muted-foreground">ROI%</TableHead>
                    <TableHead className="text-muted-foreground">Duration</TableHead>
                    <TableHead className="text-muted-foreground">Min Amount</TableHead>
                    <TableHead className="text-muted-foreground">Currency</TableHead>
                    <TableHead className="text-muted-foreground">Active</TableHead>
                    <TableHead className="text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id} className="border-[#1a3a6e]">
                      <TableCell className="text-white font-medium">{plan.name}</TableCell>
                      <TableCell className="text-gold font-bold">{plan.roi_percent}%</TableCell>
                      <TableCell className="text-muted-foreground">{plan.duration_days}d</TableCell>
                      <TableCell className="text-white">{plan.min_amount}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-gold/15 text-gold border-gold/30">
                          {plan.currency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={plan.is_active ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-patriot-red/15 text-patriot-red border-patriot-red/30"}>
                          {plan.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(plan)} className="border-gold text-gold hover:bg-gold/10">
                            Edit
                          </Button>
                          {plan.is_active && (
                            <Button size="sm" variant="outline" onClick={() => handleDelete(plan.id)} className="border-patriot-red text-patriot-red hover:bg-patriot-red/10">
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card-navy border-[#1a3a6e] text-white">
            <DialogHeader>
              <DialogTitle className="text-gold uppercase tracking-wide">{editingId ? "Edit Plan" : "New Plan"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Name</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Min Amount</Label>
                  <Input
                    required
                    type="number"
                    step="any"
                    value={form.minAmount}
                    onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))}
                    className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">ROI %</Label>
                  <Input
                    required
                    type="number"
                    step="any"
                    value={form.roiPercent}
                    onChange={(e) => setForm((f) => ({ ...f, roiPercent: e.target.value }))}
                    className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Duration (days)</Label>
                  <Input
                    required
                    type="number"
                    value={form.durationDays}
                    onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
                    className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => v && setForm((f) => ({ ...f, currency: v }))}>
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
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-60"
                >
                  {saving ? "Saving..." : editingId ? "Update Plan" : "Create Plan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
