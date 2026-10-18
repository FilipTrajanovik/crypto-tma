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
          <p className="shrink-0 text-xs font-medium tracking-[0.08em] text-[#b8cbe6]">Virtual Wallet</p>
        </div>
      </div>
    </div>
  );
}
