export type Signal = "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "AVOID";

export type RSIInterpretation = "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL";

export type MACDTrend = "BULLISH" | "BEARISH" | "NEUTRAL";

export interface MarketAsset {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  rsi: number;
  rsiInterpretation: RSIInterpretation;
  macdTrend: MACDTrend;
  signal: Signal;
  confidence: number;
  updatedAt: number;
}

export interface MarketAPIResponse {
  assets: MarketAsset[];
  errors: { symbol: string; error: string }[];
  updatedAt: number;
}
