"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/app/components/BottomNav";
import ShieldLogo from "@/app/components/ShieldLogo";
import QfsCard from "@/app/components/QfsCard";
import MarketTicker from "@/app/components/MarketTicker";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Landmark, Send, ShieldCheck, Unlock, ArrowUp, ArrowDown, FileText, MessageCircle, Timer } from "lucide-react";

type BalanceData = {
  user: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    avatarUrl: string | null;
    phone: string | null;
    releasePaid: boolean;
    releaseDeadline: string | null;
  };
  balance: { btc: number; eth: number; gold: number; usdCash: number; btcValue: number; ethValue: number; goldValue: number; totalValue: number };
  prices: { btc: number; eth: number; gold: number; btcChange24h: number; ethChange24h: number };
  supportContact: string | null;
};

function formatUsd(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function formatCountdown(msRemaining: number) {
  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

const actions = [
  { href: "/wallet/deposit", label: "Deposit", icon: Landmark, variant: "brand" as const },
  { href: "/wallet/withdraw", label: "Withdraw", icon: Send, variant: "brand" as const },
  { href: "/wallet/authorized", label: "Authorized Persons", icon: ShieldCheck, variant: "brand" as const },
  { href: "/wallet/release", label: "Release Funds", icon: Unlock, variant: "red" as const },
  { href: "/wallet/documents", label: "Documents", icon: FileText, variant: "outline" as const },
];

export default function WalletPage() {
  const router = useRouter();
  const [data, setData] = useState<BalanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/balance");
      if (res.status === 401) {
        router.replace("/auth");
        return;
      }
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        if (body?.code === "notifications_required") {
          router.replace("/auth");
          return;
        }
      }
      if (!res.ok) {
        setError(
          res.status >= 500
            ? "Our servers are having trouble right now. Please try again shortly."
            : "Could not load your wallet. Pull to refresh."
        );
        return;
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError("No connection. Check your internet and try again.");
    }
  }, [router]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!data?.user.releaseDeadline) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [data?.user.releaseDeadline]);

  if (error && !data) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center px-6">
        <Card className="bg-card-navy border-line border-l-4 border-l-patriot-red p-5 max-w-sm text-center">
          <p className="text-white mb-3">{error}</p>
          <button onClick={load} className="text-brand text-sm font-bold uppercase tracking-wide">
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
  const msRemaining = user.releaseDeadline ? new Date(user.releaseDeadline).getTime() - now : null;
  const isExpired = msRemaining !== null && msRemaining <= 0;

  const handleContactSupport = () => {
    if (!data.supportContact) return;
    const contact = data.supportContact;
    const target = contact.startsWith("http") ? contact : `https://t.me/${contact.replace(/^@/, "")}`;
    const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram;
    if (tg?.WebApp?.openTelegramLink) {
      tg.WebApp.openTelegramLink(target);
    } else {
      window.open(target, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-navy relative overflow-hidden pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="absolute inset-0 ambient-bg pointer-events-none" />

      <div className="relative max-w-md mx-auto">
        <header className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldLogo size={30} />
              <div>
                <h1 className="text-lg leading-none font-bold tracking-[0.28em] text-premium-gradient">QFS</h1>
                <p className="mt-1 text-[9px] leading-none tracking-[0.2em] uppercase text-muted-foreground">
                  Secure · Private · Trusted
                </p>
              </div>
            </div>
            <Avatar className="w-9 h-9 border border-line">
              <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="bg-brand/20 text-brand-bright font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <section className="px-5 mb-4 flex items-center divide-x divide-line/80 text-xs" aria-label="Market prices">
          {[
            { code: "BTC", price: prices.btc, up: prices.btcChange24h >= 0 },
            { code: "ETH", price: prices.eth, up: prices.ethChange24h >= 0 },
          ].map((p) => (
            <div key={p.code} className="flex-1 flex items-center justify-center gap-2 first:pr-3 last:pl-3">
              <span className="text-muted-foreground tracking-wider">{p.code}</span>
              <span className="flex items-center gap-1 font-semibold tabular-nums text-foreground">
                {formatUsd(p.price)}
                {p.up ? (
                  <ArrowUp className="w-3.5 h-3.5 text-verified-bright" aria-label="up in 24 hours" />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5 text-patriot-red" aria-label="down in 24 hours" />
                )}
              </span>
            </div>
          ))}
        </section>

        <section className="px-5 mb-5">
          <QfsCard holderName={displayName} />
        </section>

        {user.releaseDeadline && !user.releasePaid && (
          <section className="px-5 mb-5">
            <Link
              href="/wallet/release"
              className={`block rounded-xl px-4 py-3 text-center ${isExpired ? "bg-patriot-red/10" : "bg-brand/10"}`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <Timer className={`w-4 h-4 ${isExpired ? "text-patriot-red-bright" : "text-brand-bright"}`} />
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {isExpired ? "Time Expired" : "Time Remaining To Release Funds"}
                </p>
              </div>
              <p
                className={`text-2xl font-mono font-semibold tabular-nums ${
                  isExpired ? "text-red-gradient" : "text-brand-gradient"
                }`}
              >
                {isExpired ? "00h 00m 00s" : formatCountdown(msRemaining!)}
              </p>
            </Link>
          </section>
        )}

        <section className="px-5 mb-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Total Portfolio Value</p>
          <p className="mt-1 mb-3 font-display text-[36px] leading-tight font-semibold tabular-nums text-premium-gradient-glow break-words">
            {formatUsd(balance.totalValue)}
          </p>
          <div className="-mx-5">
            <MarketTicker balance={balance} prices={prices} />
          </div>
        </section>

        <section className="px-5 mb-7 flex flex-col gap-5">
          {[actions.slice(0, 3), actions.slice(3)].map((row, r) => (
            <div key={r} className={`grid gap-2 ${r === 0 ? "grid-cols-3" : "grid-cols-2 w-2/3 mx-auto"}`}>
              {row.map(({ href, label, icon: Icon, variant }, j) => {
                const i = r === 0 ? j : 3 + j;
                                return (
                  <Link
                    key={href}
                    href={href}
                    style={{ animationDelay: `${i * 0.06}s` }}
                    className="anim-rise group flex flex-col items-center gap-2 text-center active:scale-95 transition-transform"
                  >
                    <span
                      className={`flex items-center justify-center w-16 h-16 rounded-full transition-all duration-200 group-hover:brightness-110 ${
                        variant === "red"
                          ? "bg-patriot-red/15 ring-1 ring-patriot-red/40"
                          : "bg-brand-gradient shadow-brand-glow"
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${variant === "red" ? "text-patriot-red-bright" : "text-navy"}`}
                        strokeWidth={2}
                      />
                    </span>
                    <span className="text-xs font-medium leading-tight text-foreground">{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </section>

        <section className="px-5 mb-6">
          <button
          onClick={handleContactSupport}
          disabled={!data.supportContact}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-all text-brand-bright hover:bg-white/[0.06] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <MessageCircle className="w-4 h-4" />
          Contact Support
        </button>
      </section>

      </div>

      <BottomNav />
    </div>
  );
}
