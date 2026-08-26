export type Prices = {
  btc: number;
  eth: number;
  btcChange24h: number;
  ethChange24h: number;
  fetchedAt: number;
};

let cache: Prices | null = null;
const CACHE_TTL_MS = 60_000;

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true";

const FALLBACK_PRICES: Prices = {
  btc: 60000,
  eth: 3000,
  btcChange24h: 0,
  ethChange24h: 0,
  fetchedAt: 0,
};

export async function getPrices(): Promise<Prices> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }

  try {
    const res = await fetch(COINGECKO_URL, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`CoinGecko responded with ${res.status}`);
    const data = await res.json();

    const prices: Prices = {
      btc: data.bitcoin?.usd ?? cache?.btc ?? FALLBACK_PRICES.btc,
      eth: data.ethereum?.usd ?? cache?.eth ?? FALLBACK_PRICES.eth,
      btcChange24h: data.bitcoin?.usd_24h_change ?? 0,
      ethChange24h: data.ethereum?.usd_24h_change ?? 0,
      fetchedAt: now,
    };

    cache = prices;
    return prices;
  } catch {
    if (cache) return cache;
    return { ...FALLBACK_PRICES, fetchedAt: now };
  }
}
