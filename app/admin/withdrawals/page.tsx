"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/components/AdminNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

type Withdrawal = {
  id: number;
  user_id: number;
  amount: string;
  currency: string;
  status: string;
  created_at: string;
  fee_type: string | null;
  fee_value: string | null;
  fee_amount: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  telegram_id: string;
};

const FILTERS = ["pending", "approved", "rejected", "all"];

export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [dialogState, setDialogState] = useState<{ id: number; action: "approved" | "rejected" } | null>(null);
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [feeType, setFeeType] = useState<"none" | "fixed" | "percent">("none");
  const [feeValue, setFeeValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/withdrawals?status=${filter}`);
    if (res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setWithdrawals(data.withdrawals);
    }
    setLoading(false);
  }, [filter, router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDecision = async () => {
    if (!dialogState) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: dialogState.id,
          status: dialogState.action,
          adminNote: note || undefined,
          ...(dialogState.action === "approved" ? { feeType, feeValue } : {}),
        }),
      });
      if (res.ok) {
        toast.add({ title: `Withdrawal ${dialogState.action}`, type: "success" });
        setDialogState(null);
        setNote("");
        load();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.add({ title: body.error || "Failed to process withdrawal", type: "error" });
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy">
      <AdminNav />
      <main className="max-w-4xl mx-auto px-5 py-6">
        <h1 className="text-xl font-bold uppercase tracking-widest text-brand mb-5">Withdrawal Requests</h1>

        <div className="flex gap-2 mb-5">
          {FILTERS.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className={`capitalize ${filter === f ? "bg-brand text-navy hover:brightness-95" : "border-line text-muted-foreground"}`}
            >
              {f}
            </Button>
          ))}
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full rounded-2xl bg-card-navy" />
        ) : withdrawals.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-10">No withdrawal requests.</p>
        ) : (
          <Card className="bg-card-navy border-line rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-line hover:bg-transparent">
                    <TableHead className="text-muted-foreground">User</TableHead>
                    <TableHead className="text-muted-foreground">Amount</TableHead>
                    <TableHead className="text-muted-foreground">Fee</TableHead>
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((w) => (
                    <TableRow key={w.id} className="border-line">
                      <TableCell>
                        <p className="text-white text-sm">
                          {[w.first_name, w.last_name].filter(Boolean).join(" ") || "Unnamed"}
                        </p>
                        <p className="text-xs text-muted-foreground">{w.username ? `@${w.username}` : w.telegram_id}</p>
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {w.currency === "USD" ? `$${Number(w.amount).toFixed(2)}` : `${Number(w.amount)} ${w.currency}`}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {Number(w.fee_amount) > 0
                          ? `${w.currency === "USD" ? "$" : ""}${Number(w.fee_amount)}${w.currency === "USD" ? "" : ` ${w.currency}`}`
                          : "None"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize ${
                            w.status === "pending"
                              ? "bg-premium/15 text-premium border-premium/30"
                              : w.status === "approved"
                              ? "bg-verified/15 text-verified-bright border-verified/30"
                              : "bg-patriot-red/15 text-patriot-red border-patriot-red/30"
                          }`}
                        >
                          {w.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {w.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setFeeType(w.fee_type === "fixed" || w.fee_type === "percent" ? w.fee_type : "none");
                                setFeeValue(w.fee_value ? String(Number(w.fee_value)) : "");
                                setDialogState({ id: w.id, action: "approved" });
                              }}
                              className="bg-verified text-navy hover:brightness-110 font-bold uppercase text-xs"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setDialogState({ id: w.id, action: "rejected" })}
                              className="bg-patriot-red text-white hover:brightness-95 font-bold uppercase text-xs"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        <Dialog open={!!dialogState} onOpenChange={(open) => !open && setDialogState(null)}>
          <DialogContent className="bg-card-navy border-line text-white">
            <DialogHeader>
              <DialogTitle className={`uppercase tracking-wide ${dialogState?.action === "approved" ? "text-verified-bright" : "text-patriot-red"}`}>
                {dialogState?.action === "approved" ? "Approve" : "Reject"} Withdrawal
              </DialogTitle>
            </DialogHeader>
            {dialogState?.action === "approved" && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Withdrawal fee, taken out of the amount the client receives. Change it to override the default for this request.
                </p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {(["none", "fixed", "percent"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFeeType(t)}
                      className={`h-9 rounded-lg text-sm font-semibold ${
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
                    value={feeValue}
                    onChange={(e) => setFeeValue(e.target.value)}
                    placeholder={feeType === "fixed" ? "Amount in USD" : "Percent"}
                    className="bg-navy border-line focus-visible:border-brand text-white"
                  />
                )}
              </div>
            )}
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Admin note (optional)"
              className="bg-navy border-line focus-visible:border-brand text-white"
            />
            <DialogFooter>
              <Button
                onClick={handleDecision}
                disabled={processing}
                className={`w-full font-bold uppercase tracking-wide ${
                  dialogState?.action === "approved" ? "bg-verified hover:brightness-110 text-navy" : "bg-patriot-red text-white hover:brightness-95"
                }`}
              >
                {processing ? "Processing..." : `Confirm ${dialogState?.action === "approved" ? "Approval" : "Rejection"}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
