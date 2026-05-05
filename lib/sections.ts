export type SectionItem = {
  id: string;
  navLabel: string;
  title: string;
  subtitle: string;
  meta: string;
  themeColor: string;
};

export const SECTIONS: SectionItem[] = [
  {
    id: "ai-engine",
    navLabel: "AI ENGINE",
    title: "AI TRADING ENGINE",
    subtitle: "Real-time intelligence for global markets, powered by predictive AI.",
    meta: "MARKET INTELLIGENCE MODULE",
    themeColor: "#3b82f6",
  },
  {
    id: "us-markets",
    navLabel: "US MARKETS",
    title: "US MARKET SCANNER",
    subtitle: "Track Nasdaq, S&P 500, mega-cap tech, and institutional momentum.",
    meta: "INSTITUTIONAL FLOW ANALYSIS",
    themeColor: "#8b5cf6",
  },
  {
    id: "crypto",
    navLabel: "CRYPTO",
    title: "CRYPTO MOMENTUM",
    subtitle: "Detect 24/7 liquidity shifts, breakouts, whale moves, and volatility.",
    meta: "ON-CHAIN VOLATILITY SYSTEM",
    themeColor: "#f59e0b",
  },
  {
    id: "india",
    navLabel: "INDIA",
    title: "INDIA MARKET EDGE",
    subtitle: "Analyze Nifty, Bank Nifty, sector rotation, and local market strength.",
    meta: "LOCAL MARKET ADVANTAGE",
    themeColor: "#22c55e",
  },
  {
    id: "risk",
    navLabel: "RISK",
    title: "RISK CONTROL ENGINE",
    subtitle: "Protect capital with drawdown limits, exposure checks, and volatility shields.",
    meta: "CAPITAL PROTECTION LAYER",
    themeColor: "#ef4444",
  },
  {
    id: "signals",
    navLabel: "SIGNALS",
    title: "LIVE AI SIGNALS",
    subtitle: "Transparent trade ideas with confidence, reasoning, and risk levels.",
    meta: "SIGNAL CONFIDENCE SYSTEM",
    themeColor: "#06b6d4",
  },
];
