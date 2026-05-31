import { useEffect, useState } from "react";
import { CURRENCIES, convert, formatMoney, loadRates, type CurrencyCode } from "@/lib/currency";

export function PriceDisplay({
  amount,
  currency,
  size = "md",
}: {
  amount: number;
  currency: string;
  size?: "sm" | "md" | "lg";
}) {
  const [rates, setRates] = useState<Record<string, number>>({});
  useEffect(() => {
    loadRates().then(setRates);
  }, []);

  const sizeMain = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-2xl";
  return (
    <div className="space-y-1">
      <div className={`${sizeMain} font-black text-gradient`}>{formatMoney(amount, currency)}</div>
      {Object.keys(rates).length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          {CURRENCIES.filter((c) => c !== currency).map((c) => (
            <span key={c} className="px-2 py-0.5 rounded-full bg-secondary/60">
              ≈ {formatMoney(convert(amount, currency, c, rates), c as CurrencyCode)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
