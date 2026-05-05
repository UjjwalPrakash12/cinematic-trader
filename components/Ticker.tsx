"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { formatPercent, formatPrice } from "@/lib/formatters";
import { useMarketData } from "@/hooks/useMarketData";

const symbolOrder = ["BTC", "ETH", "AAPL", "NVDA", "TSLA", "NIFTY", "GOLD"];
const fallbackItems = [
  "BTC $68,420.00 +1.84%",
  "ETH $3,518.00 +1.58%",
  "AAPL $211.00 -0.54%",
  "NVDA $1,198.00 +1.54%",
  "TSLA $173.00 -2.99%",
  "NIFTY ₹22,854.00 +0.53%",
  "GOLD $2,345.00 -0.31%",
];

function buildTickerItems(
  assets: { symbol: string; price: number; changePercent: number }[] | undefined
) {
  if (!assets || assets.length === 0) return fallbackItems;
  const bySymbol = new Map(assets.map((item) => [item.symbol, item]));
  return symbolOrder.map((symbol) => {
    const asset = bySymbol.get(symbol);
    if (!asset) return `${symbol} —`;
    return `${symbol} ${formatPrice(symbol, asset.price)} ${formatPercent(asset.changePercent)}`;
  });
}

export default function Ticker() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const { data, isLoading, error } = useMarketData();
  const items = error ? fallbackItems : buildTickerItems(data?.assets);
  const loadingPrefix = isLoading && !data ? "SYNCING FEED • " : "";
  const tickerText = `${loadingPrefix}${[...items, ...items].join("      •      ")}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(motionMedia.matches);
    update();
    motionMedia.addEventListener("change", update);
    return () => motionMedia.removeEventListener("change", update);
  }, []);

  return (
    <div
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-[35] overflow-hidden border-t border-white/10 bg-black/65 backdrop-blur-md"
      aria-label="Live market ticker"
    >
      <motion.div
        className="flex w-max whitespace-nowrap py-2 text-[10px] tracking-[0.2em] text-text-secondary will-change-transform"
        animate={reducedMotion ? undefined : { x: ["0%", "-50%"] }}
        transition={reducedMotion ? undefined : { duration: 30, ease: "linear", repeat: Infinity }}
      >
        <span className="pr-20" aria-hidden="true">
          {tickerText}
        </span>
        <span className="pr-20" aria-hidden="true">
          {tickerText}
        </span>
      </motion.div>
    </div>
  );
}
