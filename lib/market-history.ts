// Price-history adapter for the Wallet Home market ticker.
//
// Uses the same free, no-key provider as lib/prices.ts (CoinGecko). It only
// returns real data points with their provider timestamps; when the provider
// is unreachable it returns `available: false` and callers must not draw a
// chart. Nothing here is simulated.

export type SparkPoint = [number, number]; // [unix ms, USD price]

export type AssetHistory = {
  points: SparkPoint[];
  /** Percentage change between the first and last point of the period. */
  changePct: number;
  from: number;
  to: number;
};

export type MarketHistory = {
  available: boolean;
  period: "24h";
  source: "CoinGecko";
  fetchedAt: number;
  btc?: AssetHistory;
  eth?: AssetHistory;
  /** XAU proxy: pax-gold tracks one troy ounce of gold (same proxy as lib/prices.ts). */
  gold?: AssetHistory;
};

const CACHE_TTL_MS = 5 * 60_000;
const MAX_POINTS = 48;
let cache: MarketHistory | null = null;

const ids = { btc: "bitcoin", eth: "ethereum", gold: "pax-gold" } as const;

function downsample(points: SparkPoint[]): SparkPoint[] {
  if (points.length <= MAX_POINTS) return points;
  const out: SparkPoint[] = [];
  for (let i = 0; i < MAX_POINTS; i++) {
    out.push(points[Math.round((i * (points.length - 1)) / (MAX_POINTS - 1))]);
  }
  return out;
}

async function fetchAsset(id: string): Promise<AssetHistory> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=1`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error(`CoinGecko responded with ${res.status}`);
  const data = await res.json();
  const raw: SparkPoint[] = Array.isArray(data?.prices)
    ? data.prices.filter((p: unknown) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    : [];
  if (raw.length < 2) throw new Error("Not enough price history");
  const first = raw[0];
  const last = raw[raw.length - 1];
  return {
    points: downsample(raw),
    changePct: ((last[1] - first[1]) / first[1]) * 100,
    from: first[0],
    to: last[0],
  };
}

export async function getMarketHistory(): Promise<MarketHistory> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache;

  const entries = await Promise.allSettled(
    (Object.keys(ids) as Array<keyof typeof ids>).map(async (key) => [key, await fetchAsset(ids[key])] as const)
  );
  const result: MarketHistory = { available: false, period: "24h", source: "CoinGecko", fetchedAt: now };
  for (const e of entries) {
    if (e.status === "fulfilled") {
      result[e.value[0]] = e.value[1];
      result.available = true;
    }
  }

  // Keep serving the last good data if a refresh fails entirely.
  if (!result.available && cache?.available) return cache;
  cache = result;
  return result;
}
