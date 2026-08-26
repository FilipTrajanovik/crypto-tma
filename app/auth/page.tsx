"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ShieldLogo from "@/app/components/ShieldLogo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Smartphone, TriangleAlert, ShieldCheck, Loader2 } from "lucide-react";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        ready: () => void;
        expand: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        requestContact: (
          callback: (
            granted: boolean,
            response?: { responseUnsafe?: { contact?: { phone_number?: string } } }
          ) => void
        ) => void;
        HapticFeedback?: { notificationOccurred: (type: string) => void };
      };
    };
  }
}

type Status = "loading" | "need-phone" | "error" | "no-telegram";

export default function AuthPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [requestingPhone, setRequestingPhone] = useState(false);

  const authenticate = useCallback(async () => {
    const tg = window.Telegram?.WebApp;

    if (!tg || !tg.initData) {
      setStatus("no-telegram");
      return;
    }

    tg.ready();
    tg.expand();
    tg.setHeaderColor?.("#0a1628");
    tg.setBackgroundColor?.("#0a1628");

    try {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: tg.initData }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Authentication failed");
        setStatus("error");
        return;
      }

      const data = await res.json();
      if (data.user.needsPhone) {
        setStatus("need-phone");
      } else {
        router.replace("/wallet");
      }
    } catch {
      setError("Could not reach the server. Please try again.");
      setStatus("error");
    }
  }, [router]);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  const handleRequestContact = () => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    setRequestingPhone(true);
    tg.requestContact(async (granted, response) => {
      if (!granted) {
        setRequestingPhone(false);
        setError("Phone number is required to continue.");
        return;
      }

      const phone = response?.responseUnsafe?.contact?.phone_number;

      try {
        if (phone) {
          await fetch("/api/auth/phone", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone }),
          });
        }
        router.replace("/wallet");
      } finally {
        setRequestingPhone(false);
      }
    });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center gap-4 px-6">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
        <p className="text-muted-foreground text-sm">Connecting to Telegram...</p>
      </div>
    );
  }

  if (status === "no-telegram") {
    const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME;
    return (
      <div className="min-h-screen bg-navy relative flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="absolute inset-0 star-bg pointer-events-none" />
        <Smartphone className="w-14 h-14 text-gold relative" />
        <h1 className="text-xl font-bold uppercase tracking-widest text-white relative">Open in Telegram</h1>
        <p className="text-muted-foreground text-sm max-w-xs relative">
          This wallet only works inside the Telegram app. Tap below to open it in Telegram.
        </p>
        {botUsername && (
          <a
            href={`https://t.me/${botUsername}`}
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 w-full max-w-xs relative h-9 px-4 text-sm"
          >
            Open in Telegram
          </a>
        )}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center gap-4 px-6 text-center">
        <TriangleAlert className="w-14 h-14 text-patriot-red" />
        <h1 className="text-xl font-bold uppercase tracking-widest text-white">Something Went Wrong</h1>
        <p className="text-muted-foreground text-sm max-w-xs">{error}</p>
        <Button onClick={authenticate} className="mt-4 bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy relative flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="absolute inset-0 star-bg pointer-events-none" />
      <ShieldLogo size={64} />
      <div className="relative">
        <h1 className="text-3xl font-bold uppercase tracking-widest text-white mb-1">QFS Wallet</h1>
        <p className="text-xs text-gold tracking-widest uppercase">Secure • Private • Trusted</p>
      </div>
      <Separator className="bg-gold/30 w-24 relative" />
      <div className="relative">
        <ShieldCheck className="w-8 h-8 text-gold mx-auto mb-3" />
        <h2 className="text-lg font-bold uppercase tracking-wide text-white mb-1">Connect Your Phone</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          We need your phone number to secure your account and enable withdrawals.
        </p>
      </div>
      {error && <p className="text-patriot-red text-sm relative">{error}</p>}
      <Button
        onClick={handleRequestContact}
        disabled={requestingPhone}
        className="bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-60 w-full max-w-xs relative"
      >
        {requestingPhone ? "Waiting for confirmation..." : "Share Phone Number"}
      </Button>
    </div>
  );
}
