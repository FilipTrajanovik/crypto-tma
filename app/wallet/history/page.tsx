"use client";

import { useEffect, useState, useCallback } from "react";
import BottomNav from "@/app/components/BottomNav";

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

const TYPE_ICON: Record<string, string> = {
  deposit: "↓",
  withdrawal: "↑",
  invest: "📈",
  release: "🔓",
  adjustment: "⚙️",
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-400",
    approved: "bg-accent/15 text-accent",
    completed: "bg-accent/15 text-accent",
    rejected: "bg-danger/15 text-danger",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full capitalize ${styles[status] || "bg-white/10 text-muted"}`}>
      {status}
    </span>
  );
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ type, status, page: String(page) });
    const res = await fetch(`/api/wallet/history?${params}`);
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions);
      setTotal(data.total);
    }
    setLoading(false);
  }, [type, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen px-5 pt-6 pb-24">
      <h1 className="text-xl font-semibold mb-4">Transaction History</h1>

      <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-1">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => {
              setType(t);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap capitalize transition-colors ${
              type === t ? "bg-accent text-navy font-medium" : "bg-card text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap capitalize transition-colors ${
              status === s ? "bg-accent text-navy font-medium" : "bg-card text-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mt-10" />
      ) : transactions.length === 0 ? (
        <p className="text-muted text-sm text-center py-10">No transactions found.</p>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="bg-card rounded-xl p-4 border border-white/5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center text-sm flex-shrink-0">
                {TYPE_ICON[tx.type] || "•"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium capitalize">{tx.type}</p>
                  <p className="font-semibold">
                    {Number(tx.amount) !== 0 ? `${tx.amount} ${tx.currency}` : tx.currency}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted">{new Date(tx.created_at).toLocaleString()}</p>
                  <StatusBadge status={tx.status} />
                </div>
                {tx.note && <p className="text-xs text-gray-400 mt-1">{tx.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg bg-card text-sm disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-muted">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 rounded-lg bg-card text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
