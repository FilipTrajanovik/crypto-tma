"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

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
    tg.setHeaderColor?.("#0a0f1e");
    tg.setBackgroundColor?.("#0a0f1e");

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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-muted text-sm">Connecting to Telegram...</p>
      </div>
    );
  }

  if (status === "no-telegram") {
    const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl mb-2">📱</div>
        <h1 className="text-xl font-semibold">Open in Telegram</h1>
        <p className="text-muted text-sm max-w-xs">
          This wallet only works inside the Telegram app. Tap below to open it in Telegram.
        </p>
        {botUsername && (
          <a
            href={`https://t.me/${botUsername}`}
            className="mt-2 bg-accent hover:bg-accent-dark transition-colors text-navy font-semibold px-6 py-3 rounded-xl w-full max-w-xs"
          >
            Open in Telegram
          </a>
        )}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl mb-2">⚠️</div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-muted text-sm max-w-xs">{error}</p>
        <button
          onClick={authenticate}
          className="mt-4 bg-accent hover:bg-accent-dark transition-colors text-navy font-semibold px-6 py-3 rounded-xl"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-5xl mb-2">📞</div>
      <h1 className="text-xl font-semibold">Connect your phone number</h1>
      <p className="text-muted text-sm max-w-xs">
        We need your phone number to secure your account and enable withdrawals.
      </p>
      {error && <p className="text-danger text-sm">{error}</p>}
      <button
        onClick={handleRequestContact}
        disabled={requestingPhone}
        className="bg-accent hover:bg-accent-dark disabled:opacity-60 transition-colors text-navy font-semibold px-6 py-3 rounded-xl w-full max-w-xs"
      >
        {requestingPhone ? "Waiting for confirmation..." : "Share phone number"}
      </button>
    </div>
  );
}
