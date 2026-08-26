"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, MessageCircle, CheckCircle2 } from "lucide-react";

type Fee = {
  title: string;
  note: string | null;
  amount: string;
  currency: string;
};

const FALLBACK_SUPPORT = process.env.NEXT_PUBLIC_BOT_USERNAME || "support";

export default function ReleasePage() {
  const [fee, setFee] = useState<Fee | null>(null);
  const [releasePaid, setReleasePaid] = useState(false);
  const [supportContact, setSupportContact] = useState(FALLBACK_SUPPORT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = (silent?: boolean) => {
      fetch("/api/wallet/release")
        .then((res) => res.json())
        .then((data) => {
          setFee(data.fee);
          setReleasePaid(data.releasePaid === true);
          if (data.supportContact) setSupportContact(data.supportContact);
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    };
    load();
    const interval = setInterval(() => load(true), 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleContactSupport = () => {
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
            <p className="text-2xl font-bold text-patriot-red">
              {Number(fee.amount).toLocaleString()} <span className="text-base">{fee.currency}</span>
            </p>
          </Card>
        </div>
      )}

      <Button
        onClick={handleContactSupport}
        className="w-full bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 mb-6"
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
