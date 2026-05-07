"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketAPIResponse, MarketAsset } from "@/types/market";

const VALID_SYMBOLS = new Set(["BTC", "ETH", "AAPL", "NVDA", "TSLA", "NIFTY", "GOLD"]);

function safeFinite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAsset(raw: unknown): MarketAsset | null {
  if (!isObject(raw)) return null;
  const symbol = typeof raw.symbol === "string" ? raw.symbol : "";
  if (!VALID_SYMBOLS.has(symbol)) return null;

  const rsiInterpretation =
    raw.rsiInterpretation === "OVERSOLD" ||
    raw.rsiInterpretation === "OVERBOUGHT" ||
    raw.rsiInterpretation === "NEUTRAL"
      ? raw.rsiInterpretation
      : "NEUTRAL";

  const macdTrend =
    raw.macdTrend === "BULLISH" || raw.macdTrend === "BEARISH" || raw.macdTrend === "NEUTRAL"
      ? raw.macdTrend
      : "NEUTRAL";

  const signal =
    raw.signal === "STRONG BUY" ||
    raw.signal === "BUY" ||
    raw.signal === "HOLD" ||
    raw.signal === "SELL" ||
    raw.signal === "AVOID"
      ? raw.signal
      : "HOLD";

  return {
    symbol,
    price: safeFinite(raw.price, 0),
    change: safeFinite(raw.change, 0),
    changePercent: safeFinite(raw.changePercent, 0),
    rsi: safeFinite(raw.rsi, 50),
    rsiInterpretation,
    macdTrend,
    signal,
    confidence: safeFinite(raw.confidence, 0),
    updatedAt: safeFinite(raw.updatedAt, Date.now()),
  };
}

async function fetchMarketData(): Promise<MarketAPIResponse> {
  const response = await fetch("/api/market", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch market data: ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!isObject(data) || !Array.isArray(data.assets)) {
    throw new Error("Invalid market data payload");
  }

  // Be permissive: never silently drop a card. Any missing / non-finite numeric
  // field is coerced to a safe default so the UI keeps rendering even if the
  // server returns a partial fallback object for that asset.
  const assets = data.assets
    .map((entry) => normalizeAsset(entry))
    .filter((entry): entry is MarketAsset => entry !== null);

  const errors = Array.isArray(data.errors)
    ? data.errors.filter(
        (entry): entry is { symbol: string; error: string } =>
          isObject(entry) && typeof entry.symbol === "string" && typeof entry.error === "string"
      )
    : [];

  return {
    assets,
    errors,
    updatedAt: safeFinite(data.updatedAt, Date.now()),
  };
}

export function useMarketData() {
  return useQuery({
    queryKey: ["market-data"],
    queryFn: fetchMarketData,
    refetchInterval: 30_000,
    staleTime: 20_000,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  });
}

export function useMarketAsset(symbol: string) {
  const query = useMarketData();
  const asset = query.data?.assets.find((item) => item.symbol === symbol);

  return {
    asset,
    isLoading: query.isLoading,
    error: query.error,
    updatedAt: query.data?.updatedAt,
  };
}
