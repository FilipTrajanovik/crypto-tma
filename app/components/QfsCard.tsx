import ShieldLogo from "@/app/components/ShieldLogo";
import GlobeBackdrop from "@/app/components/GlobeBackdrop";

// Branded virtual wallet card (decorative). It carries no card number and no
// payment-network branding because the wallet has no real payment card.
export default function QfsCard({ holderName }: { holderName: string }) {
  return (
    <div
      className="graphite-surface group relative w-full aspect-[1.586/1] rounded-[20px] overflow-hidden transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.99] select-none"
    >
      {/* low-opacity globe, reused from the app's decorative globe */}
      <GlobeBackdrop className="absolute -right-[22%] -bottom-[48%] w-[88%] opacity-30" />

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

        <svg width="38" height="30" viewBox="0 0 38 30" aria-hidden="true" className="opacity-85">
          <defs>
            <linearGradient id="chip-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fbe2a6" />
              <stop offset="0.55" stopColor="#f5c76b" />
              <stop offset="1" stopColor="#b8893a" />
            </linearGradient>
          </defs>
          <rect x="0.5" y="0.5" width="37" height="29" rx="6" fill="url(#chip-g)" />
          <g stroke="#7a5a1f" strokeOpacity="0.55" strokeWidth="0.8" fill="none">
            <path d="M0.5 10h37M0.5 20h37M13 0.5v29M25 0.5v29" />
            <rect x="13" y="10" width="12" height="10" rx="2" />
          </g>
        </svg>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-0.5">Account holder</p>
            <p className="text-sm font-medium tracking-wide text-foreground truncate">{holderName}</p>
          </div>
          <p className="shrink-0 text-[10px] font-semibold tracking-[0.2em] uppercase text-[#b8cbe6]">Virtual Wallet</p>
        </div>
      </div>
    </div>
  );
}
