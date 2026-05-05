"use client";

import CinematicSection from "@/components/CinematicSection";
import FloatingCards from "@/components/FloatingCards";
import { MARKET_ASSETS } from "@/lib/marketData";
import { SECTIONS } from "@/lib/sections";

const assetBySymbol = Object.fromEntries(
  MARKET_ASSETS.map((asset) => [asset.symbol, asset])
);

const sectionCards: Record<string, { main: string; secondary: string[] }> = {
  "ai-engine": { main: "BTC", secondary: ["ETH", "NVDA", "NIFTY"] },
  "us-markets": { main: "NVDA", secondary: ["AAPL", "TSLA", "BTC"] },
  crypto: { main: "BTC", secondary: ["ETH", "GOLD", "NVDA"] },
  india: { main: "NIFTY", secondary: ["GOLD", "BTC", "AAPL"] },
  risk: { main: "TSLA", secondary: ["AAPL", "GOLD", "ETH"] },
  signals: { main: "BTC", secondary: ["NVDA", "NIFTY", "TSLA", "ETH"] },
};

function getSectionAssets(sectionId: string) {
  const config = sectionCards[sectionId] ?? {
    main: "BTC",
    secondary: ["ETH", "NVDA", "NIFTY"],
  };

  const main = assetBySymbol[config.main] ?? MARKET_ASSETS[0];
  const secondary = config.secondary
    .map((symbol) => assetBySymbol[symbol])
    .filter((asset): asset is (typeof MARKET_ASSETS)[number] => Boolean(asset));

  return { main, secondary };
}

export default function Home() {
  return (
    <div className="w-full">
      {SECTIONS.map((section, index) => {
        const { main, secondary } = getSectionAssets(section.id);
        return (
        <CinematicSection
          key={section.id}
          id={section.id}
          index={index}
          total={SECTIONS.length}
          title={section.title}
          subtitle={section.subtitle}
          meta={section.meta}
          themeColor={section.themeColor}
        >
          <FloatingCards main={main} secondary={secondary} />
        </CinematicSection>
        );
      })}
    </div>
  );
}
