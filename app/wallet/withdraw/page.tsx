"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Withdrawal = {
  id: number;
  amount: string;
  currency: string;
  wallet_address: string;
  status: string;
  admin_note: string | null;
  created_at: string;
};

const CURRENCIES = ["BTC", "ETH", "USD"];

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

export default function WithdrawPage() {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BTC");
  const [walletAddress, setWalletAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWithdrawals = useCallback(async () => {
    const res = await fetch("/api/wallet/withdraw");
    if (res.ok) {
      const data = await res.json();
      setWithdrawals(data.withdrawals);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), currency, walletAddress }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Withdrawal request failed" });
      } else {
        setMessage({ type: "success", text: "Withdrawal request submitted." });
        setAmount("");
        setWalletAddress("");
        loadWithdrawals();
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-5 pt-6 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wallet" className="text-muted text-xl leading-none">←</Link>
        <h1 className="text-xl font-semibold">Withdraw</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-5 border border-white/5 space-y-4 mb-6">
        <div>
          <label className="text-xs text-muted block mb-1.5">Currency</label>
          <div className="grid grid-cols-3 gap-2">
            {CURRENCIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCurrency(c)}
                className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                  currency === c ? "bg-accent text-navy" : "bg-navy text-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted block mb-1.5">Amount</label>
          <input
            type="number"
            step="any"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-navy border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="text-xs text-muted block mb-1.5">Destination Wallet Address</label>
          <input
            type="text"
            required
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter wallet address"
            className="w-full bg-navy border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent"
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
          {submitting ? "Submitting..." : "Request Withdrawal"}
        </button>
      </form>

      <h2 className="text-sm font-semibold text-muted mb-3">Past Requests</h2>
      {loading ? (
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      ) : withdrawals.length === 0 ? (
        <p className="text-muted text-sm text-center py-6">No withdrawal requests yet.</p>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w) => (
            <div key={w.id} className="bg-card rounded-xl p-4 border border-white/5">
              <div className="flex justify-between items-start mb-1">
                <p className="font-medium">
                  {w.amount} {w.currency}
                </p>
                <StatusBadge status={w.status} />
              </div>
              <p className="text-xs text-muted break-all font-mono mb-1">{w.wallet_address}</p>
              <p className="text-xs text-muted">{new Date(w.created_at).toLocaleString()}</p>
              {w.admin_note && <p className="text-xs text-gray-400 mt-1">Note: {w.admin_note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
