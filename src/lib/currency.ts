import { supabase } from "@/integrations/supabase/client";

export type CurrencyCode = "YER" | "SAR" | "USD";
export const CURRENCIES: CurrencyCode[] = ["YER", "SAR", "USD"];
export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  YER: "ريال يمني",
  SAR: "ريال سعودي",
  USD: "دولار أمريكي",
};
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  YER: "﷼",
  SAR: "ر.س",
  USD: "$",
};

let ratesCache: Record<string, number> | null = null;
let ratesPromise: Promise<Record<string, number>> | null = null;

export async function loadRates(): Promise<Record<string, number>> {
  if (ratesCache) return ratesCache;
  if (ratesPromise) return ratesPromise;
  ratesPromise = (async () => {
    const { data } = await supabase.from("exchange_rates").select("base_code, quote_code, rate");
    const map: Record<string, number> = {};
    for (const r of data ?? []) map[`${r.base_code}_${r.quote_code}`] = Number(r.rate);
    ratesCache = map;
    return map;
  })();
  return ratesPromise;
}

export function convert(amount: number, from: string, to: string, rates: Record<string, number>): number {
  if (from === to) return amount;
  const direct = rates[`${from}_${to}`];
  if (direct) return amount * direct;
  const viaUsd = rates[`${from}_USD`] && rates[`USD_${to}`];
  if (viaUsd) return amount * rates[`${from}_USD`] * rates[`USD_${to}`];
  return amount;
}

export function formatMoney(amount: number, currency: string): string {
  const decimals = currency === "YER" ? 0 : 2;
  const n = new Intl.NumberFormat("ar", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.round(amount * 100) / 100);
  return `${n} ${CURRENCY_SYMBOLS[currency as CurrencyCode] ?? currency}`;
}
