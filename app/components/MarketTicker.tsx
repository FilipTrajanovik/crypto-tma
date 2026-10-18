"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { AssetHistory, MarketHistory } from "@/lib/market-history";

type Balance = {
  btc: number;
  eth: number;
  gold: number;
  usdCash: number;
  btcValue: number;
  ethValue: number;
  goldValue: number;
};
type Prices = { btc: number; eth: number; gold: number; btcChange24h: number; ethChange24h: number };

const usd = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const qty = (v: number, d: number) => v.toLocaleString("en-US", { maximumFractionDigits: d });

function Sparkline({ points, up }: { points: [number, number][]; up: boolean }) {
  const W = 84;
  const H = 28;
  const pad = 2;
  const ys = points.map((p) => p[1]);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const xy = points.map(([, y], i) => [
    (i / (points.length - 1)) * W,
    pad + (1 - (y - min) / span) * (H - pad * 2),
  ]);
  // Catmull-Rom to cubic bezier for a smooth thin line
  let d = `M${xy[0][0].toFixed(1)} ${xy[0][1].toFixed(1)}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const p0 = xy[i - 1] ?? xy[i];
    const p1 = xy[i];
    const p2 = xy[i + 1];
    const p3 = xy[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const color = up ? "#21c77a" : "#ef6464";
  const id = up ? "spark-up" : "spark-down";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${W} ${H} L0 ${H} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Item = {
  key: string;
  symbol: string;
  ticker: string;
  name: string;
  value: string;
  holding: string;
  changePct: number | null;
  history?: AssetHistory;
  isBalance?: boolean;
};

function TickerItem({ item }: { item: Item }) {
  const up = (item.changePct ?? 0) >= 0;
  const gold = item.key === "gold";
  return (
    <div className="flex items-center gap-3 px-4 shrink-0 border-r border-line/60 h-[58px]">
      <span
        className={`graphite-chip flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-sm font-semibold ${
          gold ? "!text-premium" : ""
        }`}
      >
        {item.symbol}
      </span>
      <div className="min-w-[96px]">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold tracking-wider text-foreground">{item.ticker}</span>
          <span className="text-[10px] text-muted-foreground">{item.name}</span>
        </div>
        <p className="text-sm font-semibold tabular-nums text-foreground leading-tight">{item.value}</p>
        <p className="text-[10px] text-muted-foreground tabular-nums leading-tight">{item.holding}</p>
      </div>
      {item.isBalance ? null : (
        <div className="flex flex-col items-end gap-0.5">
          {item.history ? <Sparkline points={item.history.points} up={up} /> : <span className="h-7 w-[84px]" aria-hidden="true" />}
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums ${
              item.changePct === null ? "text-muted-foreground" : up ? "text-verified-bright" : "text-patriot-red-bright"
            }`}
          >
            {item.changePct === null ? (
              "24h —"
            ) : (
              <>
                {up ? <ArrowUp className="w-2.5 h-2.5" aria-hidden="true" /> : <ArrowDown className="w-2.5 h-2.5" aria-hidden="true" />}
                {Math.abs(item.changePct).toFixed(2)}% <span className="text-muted-foreground font-normal">24h</span>
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

export default function MarketTicker({ balance, prices }: { balance: Balance; prices: Prices }) {
  const [history, setHistory] = useState<MarketHistory | null>(null);
  const [reduced, setReduced] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/market/history")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d && setHistory(d))
        .catch(() => {});
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const items: Item[] = useMemo(
    () => [
      {
        key: "btc",
        symbol: "₿",
        ticker: "BTC",
        name: "Bitcoin",
        value: usd(prices.btc),
        holding: `${qty(balance.btc, 8)} BTC · ${usd(balance.btcValue)}`,
        changePct: prices.btcChange24h ?? history?.btc?.changePct ?? null,
        history: history?.btc,
      },
      {
        key: "eth",
        symbol: "Ξ",
        ticker: "ETH",
        name: "Ethereum",
        value: usd(prices.eth),
        holding: `${qty(balance.eth, 6)} ETH · ${usd(balance.ethValue)}`,
        changePct: prices.ethChange24h ?? history?.eth?.changePct ?? null,
        history: history?.eth,
      },
      {
        key: "gold",
        symbol: "◆",
        ticker: "XAU",
        name: "Gold",
        value: usd(prices.gold),
        holding: `${qty(balance.gold, 4)} oz · ${usd(balance.goldValue)}`,
        changePct: history?.gold?.changePct ?? null,
        history: history?.gold,
      },
      {
        key: "usd",
        symbol: "$",
        ticker: "USD",
        name: "Cash balance",
        value: usd(balance.usdCash),
        holding: "Available cash",
        changePct: null,
        isBalance: true,
      },
    ],
    [balance, prices, history]
  );

  // Continuous right-to-left drift. Uses scrollLeft so the strip stays
  // natively swipeable; it pauses on hover/touch and never runs under
  // reduced-motion.
  useEffect(() => {
    const el = scroller.current;
    if (!el || reduced) return;
    let raf = 0;
    let last = performance.now();
    let pos = el.scrollLeft;
    let hold = false;
    let resumeAt = 0;

    const pause = () => {
      hold = true;
    };
    const resume = (delay = 0) => {
      hold = false;
      resumeAt = performance.now() + delay;
    };
    const onEnter = (e: PointerEvent) => e.pointerType === "mouse" && pause();
    const onLeave = (e: PointerEvent) => e.pointerType === "mouse" && resume();
    const onTouchStart = () => pause();
    const onTouchEnd = () => resume(1800);
    const onFocusIn = () => pause();
    const onFocusOut = () => resume();

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(now - last, 250);
      last = now;
      const half = el.scrollWidth / 2;
      if (hold || now < resumeAt || document.hidden || half <= el.clientWidth) {
        pos = el.scrollLeft;
        return;
      }
      pos += dt * 0.028; // ~28px/s
      if (pos >= half) pos -= half;
      el.scrollLeft = pos;
      // a user swipe backwards past the start wraps to the duplicate copy
      if (el.scrollLeft <= 0 && pos < 1) pos = 0;
    };
    raf = requestAnimationFrame(tick);

    // keep the loop seamless when swiping manually
    const onScroll = () => {
      const half = el.scrollWidth / 2;
      if (half <= 0) return;
      if (el.scrollLeft >= half) el.scrollLeft -= half;
      else if (el.scrollLeft <= 0 && hold) el.scrollLeft += half;
    };
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
      el.removeEventListener("scroll", onScroll);
    };
  }, [reduced]);

  const updated = history?.available
    ? new Date(history.fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div>
      <div
        ref={scroller}
        role="list"
        aria-label="Market prices and balances"
        tabIndex={0}
        className="no-scrollbar flex overflow-x-auto overflow-y-hidden border-y border-line/60 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)] focus-visible:outline-offset-[-2px]"
        style={{ touchAction: "pan-x pan-y" }}
      >
        {items.map((item) => (
          <div role="listitem" key={item.key}>
            <TickerItem item={item} />
          </div>
        ))}
        {/* second copy exists only to make the loop seamless */}
        {!reduced &&
          items.map((item) => (
            <div aria-hidden="true" key={`${item.key}-loop`}>
              <TickerItem item={item} />
            </div>
          ))}
      </div>
      <p className="px-5 pt-1.5 text-[10px] text-muted-foreground text-center">
        {updated
          ? `24h charts · CoinGecko · updated ${updated}`
          : history && !history.available
          ? "Chart data unavailable right now"
          : "24h change · prices from CoinGecko"}
      </p>
    </div>
  );
}
