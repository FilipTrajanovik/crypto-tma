"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, MessageCircle, CheckCircle2, Timer, Tag } from "lucide-react";

type Fee = {
  title: string;
  note: string | null;
  amount: string;
  currency: string;
  originalAmount: string;
  discountType: "percent" | "fixed" | null;
  discountValue: string | null;
  savings: string;
};

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

export default function ReleasePage() {
  const [fee, setFee] = useState<Fee | null>(null);
  const [releasePaid, setReleasePaid] = useState(false);
  const [releaseDeadline, setReleaseDeadline] = useState<string | null>(null);
  const [supportContact, setSupportContact] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const load = (silent?: boolean) => {
      fetch("/api/wallet/release")
        .then((res) => res.json())
        .then((data) => {
          setFee(data.fee);
          setReleasePaid(data.releasePaid === true);
          setReleaseDeadline(data.releaseDeadline || null);
          setSupportContact(data.supportContact || null);
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    };
    load();
    const interval = setInterval(() => load(true), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!releaseDeadline) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [releaseDeadline]);

  const msRemaining = releaseDeadline ? new Date(releaseDeadline).getTime() - now : null;
  const isExpired = msRemaining !== null && msRemaining <= 0;

  const handleContactSupport = () => {
    if (!supportContact) return;
    const target = supportContact.startsWith("http") ? supportContact : `https://t.me/${supportContact.replace(/^@/, "")}`;
    const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram;
    if (tg?.WebApp?.openTelegramLink) {
      tg.WebApp.openTelegramLink(target);
    } else {
      window.open(target, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-navy px-5 pt-6 pb-10 max-w-md mx-auto">
      <PageHeader title="Release Funds" />

      <Card className="bg-card-navy border-[#1a3a6e] border-l-4 border-l-patriot-red rounded-2xl p-5 mb-6">
        <div className="flex gap-3">
          <Lock className="w-5 h-5 text-patriot-red shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your invested and locked funds can be released once your account manager confirms the fee below has
            been paid.
          </p>
        </div>
      </Card>

      {!loading && releaseDeadline && !releasePaid && (
        <Card
          className={`rounded-2xl p-5 mb-6 text-center border-[#1a3a6e] ${
            isExpired ? "bg-patriot-red/10 border-l-4 border-l-patriot-red" : "bg-card-navy border-l-4 border-l-gold"
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Timer className={`w-4 h-4 ${isExpired ? "text-patriot-red" : "text-gold"}`} />
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {isExpired ? "Time Expired" : "Time Remaining To Release Funds"}
            </p>
          </div>
          <p className={`text-2xl font-bold tabular-nums ${isExpired ? "text-patriot-red" : "text-gold"}`}>
            {isExpired ? "00h 00m 00s" : formatCountdown(msRemaining!)}
          </p>
          {isExpired && (
            <p className="text-xs text-muted-foreground mt-2">Contact your account manager immediately.</p>
          )}
        </Card>
      )}

      {loading ? (
        <div className="space-y-3 mb-6">
          <Skeleton className="h-32 w-full rounded-2xl bg-card-navy" />
        </div>
      ) : !fee ? (
        <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5 mb-6 text-center">
          <p className="text-muted-foreground text-sm">
            No release fee has been set up for your account yet. Contact your account manager below.
          </p>
        </Card>
      ) : (
        <div className="space-y-3 mb-6">
          <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5">
            <div className="flex justify-between items-start mb-1">
              <p className="font-bold text-white uppercase">{fee.title}</p>
              {releasePaid && (
                <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/30 whitespace-nowrap">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
                </Badge>
              )}
            </div>
            {fee.note && <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{fee.note}</p>}
            {Number(fee.savings) > 0 ? (
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-lg font-medium text-muted-foreground line-through decoration-2">
                    {Number(fee.originalAmount).toLocaleString()} {fee.currency}
                  </p>
                  <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/30 whitespace-nowrap">
                    <Tag className="w-3 h-3 mr-1" />
                    {fee.discountType === "percent" ? `${fee.discountValue}% OFF` : `${fee.discountValue} ${fee.currency} OFF`}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-patriot-red mt-1">
                  {Number(fee.amount).toLocaleString()} <span className="text-base">{fee.currency}</span>
                </p>
                <p className="text-xs text-green-400 mt-1">
                  You save {Number(fee.savings).toLocaleString()} {fee.currency}
                </p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-patriot-red">
                {Number(fee.amount).toLocaleString()} <span className="text-base">{fee.currency}</span>
              </p>
            )}
          </Card>
        </div>
      )}

      <Button
        onClick={handleContactSupport}
        disabled={!supportContact}
        className="w-full bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 mb-6 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Contact Support
      </Button>

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Complete the required steps to unlock your funds. Contact your account manager for assistance.
      </p>
    </div>
  );
}
