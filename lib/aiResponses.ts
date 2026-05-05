export function getAIResponse(input: string): string {
  const normalized = input.toLowerCase().trim();

  if (normalized.includes("btc") || normalized.includes("bitcoin")) {
    return "BTC signal: BUY. Reasoning: trend structure remains bullish with steady demand and healthy pullback behavior near support bands. Confidence: 87%.";
  }
  if (normalized.includes("eth") || normalized.includes("ethereum")) {
    return "ETH signal: HOLD. Reasoning: momentum is constructive but still range-bound versus BTC leadership, so confirmation is needed above resistance. Confidence: 74%.";
  }
  if (normalized.includes("nvda") || normalized.includes("nvidia")) {
    return "NVDA signal: STRONG BUY. Reasoning: AI-sector relative strength and institutional participation continue to support continuation setups. Confidence: 92%.";
  }
  if (normalized.includes("aapl") || normalized.includes("apple")) {
    return "AAPL signal: SELL. Reasoning: relative momentum is weaker than peers and current structure remains below key trend pivots. Confidence: 69%.";
  }
  if (normalized.includes("nifty")) {
    return "NIFTY signal: BUY. Reasoning: rotation across sectors is broad and pullbacks are being absorbed, indicating stable upside pressure. Confidence: 81%.";
  }
  if (normalized.includes("gold")) {
    return "GOLD signal: HOLD. Reasoning: price action is consolidative with defensive demand, but no clean directional breakout is confirmed. Confidence: 64%.";
  }
  if (normalized.includes("tsla") || normalized.includes("tesla")) {
    return "TSLA signal: AVOID. Reasoning: volatility is elevated while momentum remains fragile, creating asymmetric downside risk in current structure. Confidence: 77%.";
  }
  if (normalized.includes("market")) {
    return "Market overview: risk appetite is selective, with strongest flows in AI leadership and resilient index components. Signal: mixed bullish bias with strict risk control. Confidence: 78%.";
  }

  return "Current read: mixed momentum with selective high-conviction pockets. Signal: HOLD until your target asset confirms trend continuation or reversal. Confidence: 71%.";
}
