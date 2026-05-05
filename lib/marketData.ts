export type Signal = "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "AVOID";

export interface Asset {
  symbol: string;
  name: string;
  category: string;
  price: number;
  change: number;
  changePercent: number;
  isUp: boolean;
  signal: Signal;
  confidence: number;
  rsi: number;
  macd: "BULLISH" | "BEARISH" | "NEUTRAL";
  volume: string;
  reasoning: string;
  sparkline: number[];
}

export const MARKET_ASSETS: Asset[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    category: "CRYPTO",
    price: 68420.15,
    change: 1234.2,
    changePercent: 1.84,
    isUp: true,
    signal: "BUY",
    confidence: 87,
    rsi: 62,
    macd: "BULLISH",
    volume: "$38.2B",
    reasoning: "Momentum and spot demand remain strong with healthy pullback structure.",
    sparkline: [38, 44, 41, 49, 58, 63, 61, 68, 72],
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    category: "CRYPTO",
    price: 3518.72,
    change: 54.66,
    changePercent: 1.58,
    isUp: true,
    signal: "HOLD",
    confidence: 74,
    rsi: 56,
    macd: "NEUTRAL",
    volume: "$16.9B",
    reasoning: "Trend is constructive but needs stronger confirmation above resistance zone.",
    sparkline: [46, 50, 48, 54, 55, 57, 56, 60, 62],
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    category: "US EQUITY",
    price: 1198.41,
    change: 18.2,
    changePercent: 1.54,
    isUp: true,
    signal: "STRONG BUY",
    confidence: 92,
    rsi: 67,
    macd: "BULLISH",
    volume: "44.1M",
    reasoning: "AI sector leadership and sustained institutional inflows support continuation.",
    sparkline: [40, 42, 45, 51, 55, 59, 63, 69, 73, 78],
  },
  {
    symbol: "AAPL",
    name: "Apple",
    category: "US EQUITY",
    price: 211.56,
    change: -1.14,
    changePercent: -0.54,
    isUp: false,
    signal: "SELL",
    confidence: 69,
    rsi: 43,
    macd: "BEARISH",
    volume: "58.8M",
    reasoning: "Weak relative strength versus peers with momentum fading below key average.",
    sparkline: [66, 64, 62, 60, 58, 57, 55, 53, 49],
  },
  {
    symbol: "NIFTY",
    name: "Nifty 50",
    category: "INDIA INDEX",
    price: 22854.9,
    change: 121.4,
    changePercent: 0.53,
    isUp: true,
    signal: "BUY",
    confidence: 81,
    rsi: 59,
    macd: "BULLISH",
    volume: "High",
    reasoning: "Sector rotation and broad participation indicate steady bullish control.",
    sparkline: [35, 38, 41, 43, 47, 50, 52, 55, 58],
  },
  {
    symbol: "GOLD",
    name: "Gold Spot",
    category: "COMMODITY",
    price: 2345.18,
    change: -7.2,
    changePercent: -0.31,
    isUp: false,
    signal: "HOLD",
    confidence: 64,
    rsi: 50,
    macd: "NEUTRAL",
    volume: "Moderate",
    reasoning: "Range-bound action suggests defensive holding rather than fresh positioning.",
    sparkline: [58, 60, 59, 57, 56, 55, 54, 56, 55],
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    category: "US EQUITY",
    price: 173.84,
    change: -5.36,
    changePercent: -2.99,
    isUp: false,
    signal: "AVOID",
    confidence: 77,
    rsi: 39,
    macd: "BEARISH",
    volume: "92.3M",
    reasoning: "Downtrend remains intact with elevated volatility and poor trend quality.",
    sparkline: [70, 66, 62, 58, 54, 49, 45, 41, 36],
  },
];
