"use client";

import { useEffect, useState, useCallback } from "react";
import BottomNav from "@/app/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Transaction = {
  id: number;
  type: string;
  amount: string;
  currency: string;
  status: string;
  note: string | null;
  created_at: string;
};

const TYPES = ["all", "deposit", "withdrawal", "invest", "release", "adjustment"];
const STATUSES = ["all", "pending", "approved", "rejected", "completed"];

const TYPE_STYLES: Record<string, string> = {
  deposit: "bg-green-500/15 text-green-400 border-green-500/30",
  withdrawal: "bg-patriot-red/15 text-patriot-red border-patriot-red/30",
  invest: "bg-gold/15 text-gold border-gold/30",
  release: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  adjustment: "bg-white/10 text-muted-foreground border-white/20",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  completed: "bg-green-500/15 text-green-400 border-green-500/30",
  approved: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  rejected: "bg-patriot-red/15 text-patriot-red border-patriot-red/30",
};

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    const params = new URLSearchParams({ type, status, page: String(page) });
    const res = await fetch(`/api/wallet/history?${params}`);
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions);
      setTotal(data.total);
    }
    if (!opts?.silent) setLoading(false);
  }, [type, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => load({ silent: true }), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen bg-navy px-5 pt-6 pb-24 max-w-md mx-auto">
      <h1 className="text-xl font-bold uppercase tracking-widest text-gold mb-5">Transaction History</h1>

      <div className="flex gap-2 mb-5">
        <Select
          value={type}
          onValueChange={(v) => {
            if (!v) return;
            setType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="bg-card-navy border-[#1a3a6e] text-white flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card-navy border-[#1a3a6e] text-white">
            {TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(v) => {
            if (!v) return;
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="bg-card-navy border-[#1a3a6e] text-white flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card-navy border-[#1a3a6e] text-white">
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-lg bg-card-navy" />
          <Skeleton className="h-14 w-full rounded-lg bg-card-navy" />
          <Skeleton className="h-14 w-full rounded-lg bg-card-navy" />
        </div>
      ) : transactions.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-10">No transactions yet</p>
      ) : (
        <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-[#1a3a6e] hover:bg-transparent">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Amount</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx, i) => (
                <TableRow key={tx.id} className={`border-[#1a3a6e] ${i % 2 === 1 ? "bg-white/[0.02]" : ""}`}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${TYPE_STYLES[tx.type] || ""}`}>
                      {tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white font-medium">
                    {Number(tx.amount) !== 0 ? `${tx.amount} ${tx.currency}` : tx.currency}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${STATUS_STYLES[tx.status] || ""}`}>
                      {tx.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="border-gold text-gold hover:bg-gold/10 disabled:opacity-40"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="border-gold text-gold hover:bg-gold/10 disabled:opacity-40"
          >
            Next
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
