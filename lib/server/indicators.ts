import "server-only";

export type MACDTrend = "BULLISH" | "BEARISH" | "NEUTRAL";

export interface RSIResult {
  value: number;
  interpretation: "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL";
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
  trend: MACDTrend;
}

export interface IndicatorSummary {
  rsi: RSIResult;
  macd: MACDResult;
  ema12: number;
  ema26: number;
}

function cleanPrices(prices: number[]): number[] {
  return prices.filter((price) => Number.isFinite(price));
}

function round(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function calculateEMASeries(prices: number[], period: number): number[] {
  const clean = cleanPrices(prices);
  if (clean.length === 0) return [];
  if (period <= 0) return [...clean];

  // EMA multiplier formula:
  // multiplier = 2 / (period + 1)
  const multiplier = 2 / (period + 1);

  // Seed EMA with the first valid price.
  let ema = clean[0];
  const series: number[] = [ema];

  for (let i = 1; i < clean.length; i += 1) {
    const price = clean[i];
    // EMA recursive formula:
    // ema = price * multiplier + previousEma * (1 - multiplier)
    ema = price * multiplier + ema * (1 - multiplier);
    series.push(ema);
  }

  return series.map((value) => (Number.isFinite(value) ? value : 0));
}

function getEMAFromSeries(series: number[]): number {
  if (series.length === 0) return 0;
  return round(series[series.length - 1]);
}

export function calculateEMA(prices: number[], period: number): number {
  const clean = cleanPrices(prices);
  if (clean.length === 0) return 0;
  if (period <= 0 || clean.length < period) return round(clean[clean.length - 1]);

  return getEMAFromSeries(calculateEMASeries(clean, period));
}

export function calculateRSI(prices: number[], period = 14): RSIResult {
  const clean = cleanPrices(prices);
  if (clean.length < period + 1) {
    return { value: 50, interpretation: "NEUTRAL" };
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i += 1) {
    const delta = clean[i] - clean[i - 1];
    if (delta > 0) gains += delta;
    else losses += Math.abs(delta);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < clean.length; i += 1) {
    const delta = clean[i] - clean[i - 1];
    const currentGain = delta > 0 ? delta : 0;
    const currentLoss = delta < 0 ? Math.abs(delta) : 0;

    // Wilder smoothing formulas:
    // avgGain = (prevAvgGain * (period - 1) + currentGain) / period
    // avgLoss = (prevAvgLoss * (period - 1) + currentLoss) / period
    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
  }

  let rsi: number;
  if (avgLoss === 0) {
    rsi = 100;
  } else {
    // RSI formulas:
    // RS = avgGain / avgLoss
    // RSI = 100 - 100 / (1 + RS)
    const rs = avgGain / avgLoss;
    rsi = 100 - 100 / (1 + rs);
  }

  const rounded = round(clamp(rsi, 0, 100));
  let interpretation: RSIResult["interpretation"] = "NEUTRAL";
  if (rounded < 30) interpretation = "OVERSOLD";
  else if (rounded > 70) interpretation = "OVERBOUGHT";

  return {
    value: rounded,
    interpretation,
  };
}

function calculateMACDFromClean(clean: number[]): MACDResult {
  if (clean.length < 26) {
    return {
      macd: 0,
      signal: 0,
      histogram: 0,
      trend: "NEUTRAL",
    };
  }

  const ema12Series = calculateEMASeries(clean, 12);
  const ema26Series = calculateEMASeries(clean, 26);

  const alignedLength = Math.min(ema12Series.length, ema26Series.length);
  const macdLine: number[] = [];
  for (let i = 0; i < alignedLength; i += 1) {
    // MACD line formula:
    // MACD = EMA(12) - EMA(26)
    const macdValue = ema12Series[i] - ema26Series[i];
    macdLine.push(Number.isFinite(macdValue) ? macdValue : 0);
  }

  const signalSeries = calculateEMASeries(macdLine, 9);
  const latestMacd = macdLine[macdLine.length - 1] ?? 0;
  const latestSignal = signalSeries[signalSeries.length - 1] ?? 0;

  // Histogram formula:
  // histogram = MACD line - signal line
  const histogram = latestMacd - latestSignal;

  let trend: MACDTrend = "NEUTRAL";
  if (histogram > 0.05) trend = "BULLISH";
  else if (histogram < -0.05) trend = "BEARISH";

  return {
    macd: round(latestMacd),
    signal: round(latestSignal),
    histogram: round(histogram),
    trend,
  };
}

export function calculateMACD(prices: number[]): MACDResult {
  return calculateMACDFromClean(cleanPrices(prices));
}

export function calculateIndicators(prices: number[]): IndicatorSummary {
  const clean = cleanPrices(prices);
  const ema12Series = calculateEMASeries(clean, 12);
  const ema26Series = calculateEMASeries(clean, 26);

  return {
    rsi: calculateRSI(clean),
    macd: calculateMACDFromClean(clean),
    ema12: clean.length === 0 ? 0 : clean.length < 12 ? round(clean[clean.length - 1]) : getEMAFromSeries(ema12Series),
    ema26: clean.length === 0 ? 0 : clean.length < 26 ? round(clean[clean.length - 1]) : getEMAFromSeries(ema26Series),
  };
}
