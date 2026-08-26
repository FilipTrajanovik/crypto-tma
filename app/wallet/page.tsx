"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/app/components/BottomNav";
import ShieldLogo from "@/app/components/ShieldLogo";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Landmark, Send, TrendingUp, Unlock, ListOrdered, ArrowUp, ArrowDown, FileText, MessageCircle } from "lucide-react";

type BalanceData = {
  user: { firstName: string | null; lastName: string | null; username: string | null; avatarUrl: string | null; phone: string | null };
  balance: { btc: number; eth: number; usdCash: number; btcValue: number; ethValue: number; totalValue: number };
  prices: { btc: number; eth: number; btcChange24h: number; ethChange24h: number };
  supportContact: string | null;
};

const FALLBACK_SUPPORT = process.env.NEXT_PUBLIC_BOT_USERNAME || "support";

function formatUsd(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function formatCrypto(value: number, decimals = 6) {
  return value.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

const actions = [
  { href: "/wallet/deposit", label: "Deposit", icon: Landmark, variant: "gold" as const },
  { href: "/wallet/withdraw", label: "Withdraw", icon: Send, variant: "gold" as const },
  { href: "/wallet/invest", label: "Invest", icon: TrendingUp, variant: "gold" as const },
  { href: "/wallet/release", label: "Release Funds", icon: Unlock, variant: "red" as const },
  { href: "/wallet/history", label: "History", icon: ListOrdered, variant: "outline" as const },
  { href: "/wallet/documents", label: "Documents", icon: FileText, variant: "outline" as const },
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
      setError(null);
    } catch {
      setError("Could not load your wallet. Pull to refresh.");
    }
  }, [router]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  if (error && !data) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center px-6">
        <Card className="bg-card-navy border-[#1a3a6e] border-l-4 border-l-patriot-red p-5 max-w-sm text-center">
          <p className="text-white mb-3">{error}</p>
          <button onClick={load} className="text-gold text-sm font-bold uppercase tracking-wide">
            Retry
          </button>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-navy px-5 pt-6 pb-24 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-11 h-11 rounded-full bg-card-navy" />
          <Skeleton className="h-6 w-32 bg-card-navy" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl bg-card-navy mb-4" />
        <Skeleton className="h-40 w-full rounded-2xl bg-card-navy mb-6" />
        <Skeleton className="h-32 w-full rounded-2xl bg-card-navy" />
      </div>
    );
  }

  const { user, balance, prices } = data;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Wallet";

  const handleContactSupport = () => {
    const contact = data.supportContact || FALLBACK_SUPPORT;
    const target = contact.startsWith("http") ? contact : `https://t.me/${contact.replace(/^@/, "")}`;
    const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram;
    if (tg?.WebApp?.openTelegramLink) {
      tg.WebApp.openTelegramLink(target);
    } else {
      window.open(target, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-navy relative pb-24">
      <div className="absolute inset-0 star-bg pointer-events-none" />

      <header className="relative px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <ShieldLogo size={32} />
          <h1 className="text-xl font-bold uppercase tracking-widest text-white">QFS Wallet</h1>
          <div className="flex items-center gap-2">
            <Avatar className="w-9 h-9 border border-[#1a3a6e]">
              <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="bg-gold/20 text-gold font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <p className="text-center text-xs text-gold tracking-widest uppercase">Secure • Private • Trusted</p>
      </header>

      <section className="relative px-5 flex items-center justify-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground uppercase text-xs tracking-wide">BTC</span>
          <span className="text-gold font-semibold">{formatUsd(prices.btc)}</span>
          {prices.btcChange24h >= 0 ? (
            <ArrowUp className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-patriot-red" />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground uppercase text-xs tracking-wide">ETH</span>
          <span className="text-gold font-semibold">{formatUsd(prices.eth)}</span>
          {prices.ethChange24h >= 0 ? (
            <ArrowUp className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-patriot-red" />
          )}
        </div>
      </section>

      <section className="relative px-5 mb-6">
        <Card className="bg-card-navy border-[#1a3a6e] border-l-4 border-l-gold rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total Portfolio Value</p>
          <p className="text-4xl font-bold text-gold mb-4">{formatUsd(balance.totalValue)}</p>

          <Separator className="bg-[#1a3a6e] mb-4" />

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">₿ Bitcoin</span>
              <span className="text-white">
                {formatCrypto(balance.btc, 8)} <span className="text-muted-foreground">({formatUsd(balance.btcValue)})</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Ξ Ethereum</span>
              <span className="text-white">
                {formatCrypto(balance.eth, 6)} <span className="text-muted-foreground">({formatUsd(balance.ethValue)})</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">$ Cash</span>
              <span className="text-white">{formatUsd(balance.usdCash)}</span>
            </div>
          </div>
        </Card>
      </section>

      <section className="relative px-5 grid grid-cols-2 gap-3 mb-6">
        {actions.map(({ href, label, icon: Icon, variant }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center gap-1.5 h-16 rounded-xl font-bold text-sm uppercase tracking-wide transition-transform active:scale-95 ${
              variant === "gold"
                ? "bg-gold text-navy hover:brightness-95"
                : variant === "red"
                ? "bg-patriot-red text-white hover:brightness-95"
                : "border-2 border-gold text-gold hover:bg-gold/10"
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </section>

      <section className="relative px-5 mb-6">
        <button
          onClick={handleContactSupport}
          className="w-full flex items-center justify-center gap-2 h-14 rounded-xl font-bold text-sm uppercase tracking-wide transition-transform active:scale-95 bg-card-navy border border-gold/40 text-gold hover:bg-gold/10"
        >
          <MessageCircle className="w-4 h-4" />
          Contact Support
        </button>
      </section>

      <BottomNav />
    </div>
  );
}
