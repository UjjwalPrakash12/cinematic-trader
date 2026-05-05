"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketAPIResponse } from "@/types/market";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

async function fetchMarketData(): Promise<MarketAPIResponse> {
  const response = await fetch("/api/market", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch market data: ${response.status}`);
  }

  const data: unknown = await response.json();
  const parsed = data as MarketAPIResponse;
  if (!parsed || !Array.isArray(parsed.assets)) {
    throw new Error("Invalid market data payload");
  }

  const assets = parsed.assets.filter(
    (asset) =>
      typeof asset?.symbol === "string" &&
      isFiniteNumber(asset.price) &&
      isFiniteNumber(asset.change) &&
      isFiniteNumber(asset.changePercent) &&
      isFiniteNumber(asset.rsi) &&
      isFiniteNumber(asset.confidence) &&
      isFiniteNumber(asset.updatedAt)
  );

  return {
    assets,
    errors: Array.isArray(parsed.errors) ? parsed.errors : [],
    updatedAt: isFiniteNumber(parsed.updatedAt) ? parsed.updatedAt : Date.now(),
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
