"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Condition = {
  id: number;
  title: string;
  description: string | null;
  fee_amount: string;
  fee_currency: string;
};

const SUPPORT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || "support";

export default function ReleasePage() {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wallet/release")
      .then((res) => res.json())
      .then((data) => setConditions(data.conditions || []))
      .finally(() => setLoading(false));
  }, []);

  const handleContactSupport = () => {
    const url = `https://t.me/${SUPPORT_USERNAME}`;
    const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram;
    if (tg?.WebApp?.openTelegramLink) {
      tg.WebApp.openTelegramLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="min-h-screen px-5 pt-6 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wallet" className="text-muted text-xl leading-none">←</Link>
        <h1 className="text-xl font-semibold">Release Funds</h1>
      </div>

      <p className="text-sm text-muted mb-6 leading-relaxed">
        Your invested and locked funds can be released once the conditions below are met. Review the requirements,
        then contact your account manager to begin the release process.
      </p>

      {loading ? (
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      ) : conditions.length === 0 ? (
        <p className="text-muted text-sm text-center py-6">No release conditions configured right now.</p>
      ) : (
        <div className="space-y-3 mb-6">
          {conditions.map((c) => (
            <div key={c.id} className="bg-card rounded-2xl p-5 border border-white/5">
              <p className="font-semibold mb-1">{c.title}</p>
              {c.description && <p className="text-sm text-muted mb-3 leading-relaxed">{c.description}</p>}
              <div className="inline-flex items-center gap-2 bg-navy rounded-lg px-3 py-2 text-sm">
                <span className="text-muted">Fee required:</span>
                <span className="font-semibold text-accent">
                  {Number(c.fee_amount).toLocaleString()} {c.fee_currency}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleContactSupport}
        className="w-full bg-accent hover:bg-accent-dark transition-colors text-navy font-semibold py-3 rounded-xl text-sm"
      >
        Contact Support
      </button>
    </div>
  );
}
