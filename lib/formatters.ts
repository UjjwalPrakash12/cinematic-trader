function safeFinite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function formatNumber(value: number): string {
  const safe = safeFinite(value);
  return safe.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatPrice(symbol: string, value: number): string {
  const safe = safeFinite(value);
  if (symbol === "NIFTY") {
    return `₹${safe.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  if (symbol === "BTC" || symbol === "ETH" || symbol === "GOLD") {
    return `$${safe.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  return `$${safe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number): string {
  const safe = safeFinite(value);
  const sign = safe > 0 ? "+" : "";
  return `${sign}${safe.toFixed(2)}%`;
}

export function safeDisplay<T>(value: T, fallback = "—"): T | string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number" && !Number.isFinite(value)) return fallback;
  return value;
}
