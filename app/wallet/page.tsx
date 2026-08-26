"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/app/components/BottomNav";

type BalanceData = {
  user: { firstName: string | null; lastName: string | null; username: string | null; avatarUrl: string | null; phone: string | null };
  balance: { btc: number; eth: number; usdCash: number; btcValue: number; ethValue: number; totalValue: number };
  prices: { btc: number; eth: number; btcChange24h: number; ethChange24h: number };
};

function formatUsd(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function formatCrypto(value: number, decimals = 6) {
  return value.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

const actions = [
  { href: "/wallet/deposit", label: "Deposit", icon: "↓" },
  { href: "/wallet/withdraw", label: "Withdraw", icon: "↑" },
  { href: "/wallet/invest", label: "Invest", icon: "📈" },
  { href: "/wallet/release", label: "Release", icon: "🔓" },
  { href: "/wallet/history", label: "History", icon: "🕓" },
];

export default function WalletPage() {
  const router = useRouter();
  const [data, setData] = useState<BalanceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/balance");
      if (res.status === 401) {
        router.replace("/auth");
        return;
      }
      if (!res.ok) throw new Error("Failed to load balance");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Could not load your wallet. Pull to refresh.");
    }
  }, [router]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { user, balance, prices } = data;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Wallet";

  return (
    <div className="min-h-screen pb-24">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt={displayName} className="w-11 h-11 rounded-full object-cover border border-white/10" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold text-lg">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm text-muted">Welcome back</p>
          <p className="text-lg font-semibold">{displayName}</p>
        </div>
      </header>

      <section className="px-5 grid grid-cols-2 gap-3 mb-4">
        <div className="bg-card rounded-2xl p-4 border border-white/5">
          <p className="text-xs text-muted mb-1">BTC</p>
          <p className="text-base font-semibold">{formatUsd(prices.btc)}</p>
          <p className={`text-xs mt-1 ${prices.btcChange24h >= 0 ? "text-accent" : "text-danger"}`}>
            {prices.btcChange24h >= 0 ? "▲" : "▼"} {Math.abs(prices.btcChange24h).toFixed(2)}%
          </p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-white/5">
          <p className="text-xs text-muted mb-1">ETH</p>
          <p className="text-base font-semibold">{formatUsd(prices.eth)}</p>
          <p className={`text-xs mt-1 ${prices.ethChange24h >= 0 ? "text-accent" : "text-danger"}`}>
            {prices.ethChange24h >= 0 ? "▲" : "▼"} {Math.abs(prices.ethChange24h).toFixed(2)}%
          </p>
        </div>
      </section>

      <section className="px-5 mb-6">
        <div className="bg-gradient-to-br from-card to-navy rounded-3xl p-6 border border-white/5 shadow-lg">
          <p className="text-xs text-muted mb-1">Total Portfolio Value</p>
          <p className="text-3xl font-bold mb-4">{formatUsd(balance.totalValue)}</p>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted">₿ Bitcoin</span>
              <span>
                {formatCrypto(balance.btc, 8)} <span className="text-muted">({formatUsd(balance.btcValue)})</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted">Ξ Ethereum</span>
              <span>
                {formatCrypto(balance.eth, 6)} <span className="text-muted">({formatUsd(balance.ethValue)})</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted">$ Cash</span>
              <span>{formatUsd(balance.usdCash)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 grid grid-cols-5 gap-2 mb-6">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-2 bg-card hover:bg-white/5 transition-colors rounded-2xl py-4 border border-white/5"
          >
            <span className="text-xl">{action.icon}</span>
            <span className="text-[11px] text-muted text-center leading-tight">{action.label}</span>
          </Link>
        ))}
      </section>

      <BottomNav />
    </div>
  );
}
