"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/components/AdminNav";

type Withdrawal = {
  id: number;
  user_id: number;
  amount: string;
  currency: string;
  wallet_address: string;
  status: string;
  admin_note: string | null;
  created_at: string;
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
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [processing, setProcessing] = useState<number | null>(null);

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

  const handleDecision = async (id: number, status: "approved" | "rejected") => {
    setProcessing(id);
    try {
      await fetch("/api/admin/withdrawals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, adminNote: noteDrafts[id] || undefined }),
      });
      load();
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="max-w-4xl mx-auto px-5 py-6">
        <h1 className="text-xl font-semibold mb-4">Withdrawal Requests</h1>

        <div className="flex gap-2 mb-5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs capitalize transition-colors ${
                filter === f ? "bg-accent text-navy font-medium" : "bg-card text-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mt-10" />
        ) : withdrawals.length === 0 ? (
          <p className="text-muted text-sm text-center py-10">No withdrawal requests.</p>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((w) => (
              <div key={w.id} className="bg-card rounded-2xl p-4 border border-white/5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">
                      {[w.first_name, w.last_name].filter(Boolean).join(" ") || "Unnamed"}
                      {w.username && <span className="text-muted font-normal"> @{w.username}</span>}
                    </p>
                    <p className="text-xs text-muted">Telegram ID {w.telegram_id}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full capitalize ${
                      w.status === "pending"
                        ? "bg-yellow-500/15 text-yellow-400"
                        : w.status === "approved"
                        ? "bg-accent/15 text-accent"
                        : "bg-danger/15 text-danger"
                    }`}
                  >
                    {w.status}
                  </span>
                </div>
                <p className="text-sm mb-1">
                  {w.amount} {w.currency}
                </p>
                <p className="text-xs text-muted break-all font-mono mb-3">{w.wallet_address}</p>
                <p className="text-xs text-muted mb-3">{new Date(w.created_at).toLocaleString()}</p>

                {w.admin_note && <p className="text-xs text-gray-400 mb-3">Note: {w.admin_note}</p>}

                {w.status === "pending" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Admin note (optional)"
                      value={noteDrafts[w.id] || ""}
                      onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [w.id]: e.target.value }))}
                      className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-accent"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={processing === w.id}
                        onClick={() => handleDecision(w.id, "approved")}
                        className="flex-1 bg-accent hover:bg-accent-dark disabled:opacity-60 transition-colors text-navy font-semibold py-2 rounded-lg text-xs"
                      >
                        Approve
                      </button>
                      <button
                        disabled={processing === w.id}
                        onClick={() => handleDecision(w.id, "rejected")}
                        className="flex-1 bg-danger/15 hover:bg-danger/25 disabled:opacity-60 transition-colors text-danger font-semibold py-2 rounded-lg text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
