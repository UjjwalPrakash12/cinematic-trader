import { NextResponse } from "next/server";
import { getAllMarketData } from "@/lib/server/marketData";
import { calculateIndicators } from "@/lib/server/indicators";
import {
  RATE_LIMIT_PRESETS,
  checkRateLimit,
  getClientIdentifier,
  rateLimitHeaders,
} from "@/lib/server/rateLimit";
import { apiErrorResponse, apiSuccessHeaders } from "@/lib/server/apiError";

export const dynamic = "force-dynamic";

type Signal = "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "AVOID";
type RSIInterpretation = "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL";
type MACDTrend = "BULLISH" | "BEARISH" | "NEUTRAL";

interface APIAsset {
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

interface APIResponse {
  assets: APIAsset[];
  errors: { symbol: string; error: string }[];
  updatedAt: number;
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

const VALID_SYMBOLS = new Set(["BTC", "ETH", "AAPL", "NVDA", "TSLA", "NIFTY", "GOLD"]);

function normalizeInterpretation(value: unknown): RSIInterpretation {
  return value === "OVERSOLD" || value === "OVERBOUGHT" || value === "NEUTRAL"
    ? value
    : "NEUTRAL";
}

function normalizeMACDTrend(value: unknown): MACDTrend {
  return value === "BULLISH" || value === "BEARISH" || value === "NEUTRAL" ? value : "NEUTRAL";
}

function normalizeAssetSymbol(value: unknown): string {
  const symbol = typeof value === "string" ? value.toUpperCase() : "UNKNOWN";
  return VALID_SYMBOLS.has(symbol) ? symbol : "UNKNOWN";
}

function generateSignal(
  rsi: number,
  macdTrend: MACDTrend
): { signal: Signal; confidence: number } {
  let score = 0;

  if (rsi < 30) score += 2;
  else if (rsi > 70) score -= 2;

  if (macdTrend === "BULLISH") score += 1;
  else if (macdTrend === "BEARISH") score -= 1;

  let signal: Signal;

  if (score >= 3) signal = "STRONG BUY";
  else if (score >= 1) signal = "BUY";
  else if (score === 0) signal = "HOLD";
  else if (score >= -2) signal = "SELL";
  else signal = "AVOID";

  const confidence = Math.min(95, Math.abs(score) * 25);

  return { signal, confidence };
}

export async function GET(request: Request) {
  const identifier = getClientIdentifier(request);
  const limit = await checkRateLimit(identifier, {
    ...RATE_LIMIT_PRESETS.publicRead,
    namespace: "market",
  });
  const limitHeaders = rateLimitHeaders(limit);
  if (!limit.allowed) {
    return apiErrorResponse("rate-limited", {
      status: 429,
      publicMessage: "Too many requests. Please slow down.",
      headers: limitHeaders,
    });
  }

  console.info("[market] GET /api/market called");

  try {
    const result = await getAllMarketData();

    const assets: APIAsset[] = [];
    const errors: { symbol: string; error: string }[] = result.errors.map((entry) => ({
      symbol: normalizeAssetSymbol(entry.symbol),
      // Generic, non-leaky public message — upstream provider details are
      // logged server-side via the marketData module, not echoed to clients.
      error: `Failed to fetch market data for ${normalizeAssetSymbol(entry.symbol)}.`,
    }));

    for (const item of result.assets) {
      try {
        const history = Array.isArray(item.history)
          ? item.history.filter((n) => Number.isFinite(n))
          : [];
        const safeHistory =
          history.length >= 2 ? history : [safeNumber(item.previousClose), safeNumber(item.price)];

        const indicators = calculateIndicators(safeHistory);

        const symbol = normalizeAssetSymbol(item.displaySymbol);
        const rsiValue = clamp(safeNumber(indicators.rsi.value, 50), 0, 100);
        const rsiInterpretation = normalizeInterpretation(indicators.rsi.interpretation);
        const macdTrend = normalizeMACDTrend(indicators.macd.trend);
        const { signal, confidence } = generateSignal(rsiValue, macdTrend);

        assets.push({
          symbol,
          price: safeNumber(item.price),
          change: safeNumber(item.change),
          changePercent: safeNumber(item.changePercent),
          rsi: rsiValue,
          rsiInterpretation,
          macdTrend,
          signal,
          confidence: clamp(safeNumber(confidence), 0, 95),
          updatedAt: safeNumber(item.updatedAt, Date.now()),
        });
      } catch (err) {
        const symbol = normalizeAssetSymbol(item.displaySymbol);
        // Log the underlying cause server-side; surface only a safe message.
        console.error(`[market] indicator processing failed for ${symbol}`, err);
        errors.push({
          symbol,
          error: `Failed to process indicators for ${symbol}.`,
        });
      }
    }

    return NextResponse.json<APIResponse>(
      {
        assets,
        errors,
        updatedAt: Date.now(),
      },
      {
        status: 200,
        headers: apiSuccessHeaders(limitHeaders),
      }
    );
  } catch (err) {
    return apiErrorResponse(err, {
      status: 500,
      publicMessage: "Failed to fetch market data.",
      headers: limitHeaders,
    });
  }
}

export async function POST() {
  return apiErrorResponse("method-not-allowed", {
    status: 405,
    publicMessage: "Method not allowed.",
    headers: { Allow: "GET" },
  });
}

export async function PUT() {
  return apiErrorResponse("method-not-allowed", {
    status: 405,
    publicMessage: "Method not allowed.",
    headers: { Allow: "GET" },
  });
}

export async function DELETE() {
  return apiErrorResponse("method-not-allowed", {
    status: 405,
    publicMessage: "Method not allowed.",
    headers: { Allow: "GET" },
  });
}

export async function PATCH() {
  return apiErrorResponse("method-not-allowed", {
    status: 405,
    publicMessage: "Method not allowed.",
    headers: { Allow: "GET" },
  });
}
