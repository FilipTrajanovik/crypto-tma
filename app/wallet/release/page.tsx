"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, MessageCircle } from "lucide-react";

type Condition = {
  id: number;
  title: string;
  description: string | null;
  fee_amount: string;
  fee_currency: string;
};

const FALLBACK_SUPPORT = process.env.NEXT_PUBLIC_BOT_USERNAME || "support";

export default function ReleasePage() {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [supportContact, setSupportContact] = useState(FALLBACK_SUPPORT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = (silent?: boolean) => {
      fetch("/api/wallet/release")
        .then((res) => res.json())
        .then((data) => {
          setConditions(data.conditions || []);
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
            Your invested and locked funds can be released once the conditions below are met. Review the
            requirements, then contact your account manager to begin the release process.
          </p>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3 mb-6">
          <Skeleton className="h-32 w-full rounded-2xl bg-card-navy" />
        </div>
      ) : conditions.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-6">No release conditions configured right now</p>
      ) : (
        <div className="space-y-3 mb-6">
          {conditions.map((c) => (
            <Card key={c.id} className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5">
              <p className="font-bold text-white uppercase mb-1">{c.title}</p>
              {c.description && <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{c.description}</p>}
              <p className="text-2xl font-bold text-patriot-red">
                {Number(c.fee_amount).toLocaleString()} <span className="text-base">{c.fee_currency}</span>
              </p>
            </Card>
          ))}
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
