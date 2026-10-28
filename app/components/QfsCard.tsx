"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";
import ShieldLogo from "@/app/components/ShieldLogo";
import GlobeBackdrop from "@/app/components/GlobeBackdrop";

export type QfsCardDetails = { number: string; expiry: string; cvv: string; hasPhone: boolean };

// Branded virtual wallet card. Customers whose release is paid get card
// details; tapping the card flips it to show them.
export default function QfsCard({ holderName, card }: { holderName: string; card?: QfsCardDetails | null }) {
  const [flipped, setFlipped] = useState(false);

  const addToWallet = () => {
    if (!card?.hasPhone) {
      toast.add({ title: "You need to buy a phone from the Shop to add this card to your wallet.", type: "error" });
      return;
    }
    toast.add({ title: "Card added to your wallet.", type: "success" });
  };

  const front = (
    <div
      className="graphite-surface group absolute inset-0 rounded-[20px] overflow-hidden [backface-visibility:hidden] select-none"
      style={{ WebkitBackfaceVisibility: "hidden" }}
    >
      {/* low-opacity globe, reused from the app's decorative globe */}
      <GlobeBackdrop className="absolute -right-[22%] -bottom-[48%] w-[88%] opacity-45" />

      {/* soft reflection */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-70 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(115deg, rgba(241,245,251,0) 32%, rgba(241,245,251,0.06) 44%, rgba(241,245,251,0) 56%), radial-gradient(ellipse 60% 50% at 0% 0%, rgba(190,205,226,0.1), transparent 70%)",
        }}
      />

      <div className="relative h-full flex flex-col justify-between p-4 min-[380px]:p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldLogo size={30} />
            <span className="text-[22px] leading-none font-bold tracking-[0.32em] text-premium-gradient">QFS</span>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F1F5FB" strokeOpacity="0.75" strokeWidth="1.6" strokeLinecap="round" aria-label="Contactless">
            <path d="M8.5 8.5a5 5 0 0 1 0 7" />
            <path d="M12 6a8.5 8.5 0 0 1 0 12" />
            <path d="M15.5 3.5a12 12 0 0 1 0 17" />
          </svg>
        </div>

        <svg width="42" height="32" viewBox="0 0 42 32" aria-hidden="true">
          <defs>
            <linearGradient id="chip-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fdeab8" />
              <stop offset="0.5" stopColor="#f5c76b" />
              <stop offset="1" stopColor="#b8893a" />
            </linearGradient>
            <linearGradient id="chip-shine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.35" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="0.5" y="0.5" width="41" height="31" rx="7" fill="url(#chip-g)" />
          <g stroke="#6b4c16" strokeOpacity="0.6" strokeWidth="0.9" fill="none" strokeLinecap="round">
            <path d="M0.5 11h9.5q4 0 4 5t-4 5H0.5" />
            <path d="M41.5 11H32q-4 0-4 5t4 5h9.5" />
            <path d="M14 0.5v8M28 0.5v8M14 23.5v8M28 23.5v8" />
            <path d="M14 8.5h14M14 23.5h14" />
            <rect x="14" y="8.5" width="14" height="15" rx="3" fill="#f9dc94" fillOpacity="0.55" />
          </g>
          <rect x="0.5" y="0.5" width="41" height="31" rx="7" fill="url(#chip-shine)" />
        </svg>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">Account holder</p>
            <p className="text-[15px] font-medium tracking-wide text-foreground truncate">{holderName}</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (!card) {
    return <div className="relative w-full aspect-[1.586/1] transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.99]">{front}</div>;
  }

  const back = (
    <div className="graphite-surface absolute inset-0 rounded-[20px] overflow-hidden [backface-visibility:hidden] select-none" style={{ WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
      <div className="relative h-full flex flex-col justify-between p-4 min-[380px]:p-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold tracking-[0.32em] text-premium-gradient">QFS</span>
          <ShieldLogo size={22} />
        </div>
        <p className="font-mono text-[19px] min-[380px]:text-[21px] tracking-[0.12em] text-foreground tabular-nums">{card.number}</p>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Card holder</p>
            <p className="text-sm font-medium text-foreground truncate">{holderName}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expires</p>
            <p className="text-sm font-mono text-foreground">{card.expiry}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">CSV</p>
            <p className="text-sm font-mono text-foreground">{card.cvv}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={flipped ? "Hide card details" : "Show card details"}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFlipped((f) => !f)}
        className="relative w-full aspect-[1.586/1] cursor-pointer"
        style={{ perspective: 1000, WebkitPerspective: 1000 }}
      >
        <div
          className="absolute inset-0 transition-transform duration-700"
          style={{ transformStyle: "preserve-3d", WebkitTransformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "none" }}
        >
          {front}
          {back}
        </div>
      </div>
      {flipped && (
        <button
          type="button"
          onClick={addToWallet}
          className="mt-3 w-full h-11 rounded-xl bg-brand-gradient text-navy text-sm font-bold shadow-brand-glow active:scale-[0.98] transition-transform"
        >
          Add to Wallet
        </button>
      )}
    </div>
  );
}
