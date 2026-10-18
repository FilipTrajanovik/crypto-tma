// Pure fee maths, safe to import from client components.

export type FeeType = "fixed" | "percent";
export type FeeConfig = { type: FeeType | null; value: number };
export type WithdrawalCurrency = "USD" | "BTC" | "ETH" | "GOLD";

export const CURRENCY_DECIMALS: Record<WithdrawalCurrency, number> = { USD: 2, BTC: 8, ETH: 6, GOLD: 4 };

type Rates = { btc: number; eth: number; gold: number };

export function usdPrice(currency: WithdrawalCurrency, prices: Rates): number {
  return currency === "USD" ? 1 : currency === "BTC" ? prices.btc : currency === "ETH" ? prices.eth : prices.gold;
}

/**
 * Fee in the withdrawal's own currency. A fixed fee is entered in USD and
 * converted at the current price; a percentage applies to the amount.
 */
export function computeFeeAmount(
  amount: number,
  currency: WithdrawalCurrency,
  config: FeeConfig,
  prices: Rates
): number {
  if (!config.type || config.value <= 0) return 0;
  const raw = config.type === "percent" ? (amount * config.value) / 100 : config.value / usdPrice(currency, prices);
  const f = Math.pow(10, CURRENCY_DECIMALS[currency]);
  return Math.round(raw * f) / f;
}
