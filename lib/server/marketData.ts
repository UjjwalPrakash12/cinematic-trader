import "server-only";

export type MarketSource = "yahoo" | "coingecko";

export interface NormalizedMarketData {
  symbol: string;
  displaySymbol: string;
  source: MarketSource;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  history: number[];
  updatedAt: number;
  isFallback?: boolean;
}

export interface MarketDataError {
  symbol: string;
  error: string;
}

const CACHE_TTL = 30_000;
const FETCH_TIMEOUT_MS = 10_000;

// Mock-safe fallback history per spec. Used only when upstream is unavailable.
const FALLBACK_HISTORY: ReadonlyArray<number> = [100, 101, 102, 101, 103];

const cache = new Map<
  string,
  {
    data: NormalizedMarketData;
    timestamp: number;
  }
>();

const inFlight = new Map<string, Promise<NormalizedMarketData>>();

function getCached(key: string): NormalizedMarketData | null {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp >= CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return cached.data;
}

function setCached(key: string, data: NormalizedMarketData): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

function getInFlight(key: string): Promise<NormalizedMarketData> | null {
  return inFlight.get(key) ?? null;
}

function setInFlight(key: string, promise: Promise<NormalizedMarketData>): void {
  inFlight.set(key, promise);
}

function clearInFlight(key: string): void {
  inFlight.delete(key);
}

function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function round(value: number, digits = 2): number {
  const num = safeNumber(value, 0);
  if (!Number.isFinite(num)) return 0;
  const factor = 10 ** digits;
  return Math.round(num * factor) / factor;
}

function normalizeHistory(history: unknown, price: number, previousClose: number): number[] {
  const values = Array.isArray(history)
    ? history
        .map((point) => safeNumber(point, Number.NaN))
        .filter((point) => Number.isFinite(point))
        .map((point) => round(point))
    : [];

  if (values.length >= 2) return values;
  const safePrevious = round(safeNumber(previousClose, 0));
  const safePrice = round(safeNumber(price, safePrevious));
  return [safePrevious, safePrice];
}

function buildSafeMarketData(
  input: (Partial<Omit<NormalizedMarketData, "history">> & { history?: unknown }) &
    Pick<NormalizedMarketData, "symbol" | "displaySymbol" | "source">
): NormalizedMarketData {
  const safePrice = round(safeNumber(input.price, 0));
  const safePreviousClose = round(safeNumber(input.previousClose, safePrice));
  const safeChange = round(safeNumber(input.change, safePrice - safePreviousClose));
  const safeChangePercent =
    safePreviousClose !== 0
      ? round(safeNumber(input.changePercent, (safeChange / safePreviousClose) * 100))
      : 0;
  const safeHistory = normalizeHistory(input.history, safePrice, safePreviousClose);

  return {
    symbol: input.symbol,
    displaySymbol: input.displaySymbol,
    source: input.source,
    price: safePrice,
    previousClose: safePreviousClose,
    change: safeChange,
    changePercent: safeChangePercent,
    history: safeHistory,
    updatedAt: safeNumber(input.updatedAt, Date.now()),
    isFallback: input.isFallback ?? false,
  };
}

function buildFallbackMarketData(
  symbol: string,
  displaySymbol: string,
  source: MarketSource
): NormalizedMarketData {
  return buildSafeMarketData({
    symbol,
    displaySymbol,
    source,
    price: 0,
    previousClose: 0,
    change: 0,
    changePercent: 0,
    history: [...FALLBACK_HISTORY],
    updatedAt: Date.now(),
    isFallback: true,
  });
}

function errorMessage(prefix: string, displaySymbol: string, detail?: string): string {
  return `${prefix} for ${displaySymbol}${detail ? `: ${detail}` : ""}`;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

const COMMON_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
};

async function withCache(
  key: string,
  loader: () => Promise<NormalizedMarketData>
): Promise<NormalizedMarketData> {
  const cached = getCached(key);
  if (cached) return cached;

  const currentInFlight = getInFlight(key);
  if (currentInFlight) return currentInFlight;

  const request = loader()
    .then((data) => {
      setCached(key, data);
      return data;
    })
    .finally(() => {
      clearInFlight(key);
    });

  setInFlight(key, request);
  return request;
}

export async function getYahooMarketData(
  yahooSymbol: string,
  displaySymbol = yahooSymbol
): Promise<NormalizedMarketData> {
  const cacheKey = `yahoo:${yahooSymbol}`;
  return withCache(cacheKey, async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      yahooSymbol
    )}?range=1mo&interval=1d`;

    const response = await fetchWithTimeout(url, { headers: COMMON_HEADERS });

    if (!response.ok) {
      throw new Error(
        errorMessage("Yahoo HTTP error", displaySymbol, `status ${response.status}`)
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (err) {
      throw new Error(
        errorMessage(
          "Invalid Yahoo JSON",
          displaySymbol,
          err instanceof Error ? err.message : "parse failed"
        )
      );
    }

    const chart = payload as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: unknown;
            previousClose?: unknown;
            chartPreviousClose?: unknown;
          };
          indicators?: { quote?: Array<{ close?: unknown[] }> };
        }>;
        error?: { description?: string; code?: string } | null;
      };
    };

    if (chart.chart?.error) {
      const detail = chart.chart.error.description ?? chart.chart.error.code ?? "upstream error";
      throw new Error(errorMessage("Yahoo upstream error", displaySymbol, detail));
    }

    const result = Array.isArray(chart.chart?.result) ? chart.chart?.result?.[0] : undefined;
    const meta = result?.meta;
    const quote = Array.isArray(result?.indicators?.quote)
      ? result?.indicators?.quote?.[0]
      : undefined;

    if (!result || !meta) {
      throw new Error(errorMessage("Invalid Yahoo response shape", displaySymbol));
    }

    // Build a clean numeric history from the chart "close" series first; we
    // need it for both price-fallback and previous-close-fallback paths.
    const rawCloses = Array.isArray(quote?.close) ? (quote!.close as unknown[]) : [];
    const cleanCloses = rawCloses
      .map((p) => safeNumber(p, Number.NaN))
      .filter((p) => Number.isFinite(p));

    // Price preference order:
    //   1. meta.regularMarketPrice
    //   2. last close in the history series
    let price = safeNumber(meta.regularMarketPrice, Number.NaN);
    if (!Number.isFinite(price) && cleanCloses.length > 0) {
      price = cleanCloses[cleanCloses.length - 1];
    }

    // Previous-close preference order. Yahoo's 1mo/1d response typically
    // populates only `chartPreviousClose` (which represents ~30 days ago, not
    // yesterday) — that was the root-cause bug behind every Yahoo asset
    // returning zeros. We prefer day-over-day, falling back to the chart
    // window only as a last resort:
    //   1. meta.previousClose                          (day-over-day, ideal)
    //   2. second-to-last close in history             (day-over-day, derived)
    //   3. meta.chartPreviousClose                     (~1 month, last resort)
    //   4. price                                       (so change=0 not NaN)
    let previousClose = safeNumber(meta.previousClose, Number.NaN);
    if (!Number.isFinite(previousClose) && cleanCloses.length >= 2) {
      previousClose = cleanCloses[cleanCloses.length - 2];
    }
    if (!Number.isFinite(previousClose)) {
      previousClose = safeNumber(meta.chartPreviousClose, Number.NaN);
    }
    if (!Number.isFinite(previousClose)) {
      previousClose = price;
    }

    if (!Number.isFinite(price)) {
      throw new Error(errorMessage("Yahoo missing price", displaySymbol));
    }

    return buildSafeMarketData({
      symbol: yahooSymbol,
      displaySymbol,
      source: "yahoo",
      price,
      previousClose,
      change: price - previousClose,
      changePercent: previousClose !== 0 ? ((price - previousClose) / previousClose) * 100 : 0,
      history: cleanCloses,
      updatedAt: Date.now(),
    });
  });
}

interface CoinGeckoBatchEntry {
  usd?: unknown;
  usd_24h_change?: unknown;
}
type CoinGeckoBatchPayload = Record<string, CoinGeckoBatchEntry>;

let coingeckoBatchInFlight: Promise<CoinGeckoBatchPayload> | null = null;
let coingeckoBatchCache: { data: CoinGeckoBatchPayload; timestamp: number } | null = null;

/**
 * Batched CoinGecko price fetch — single round-trip for all coins, cached for
 * `CACHE_TTL`. Reduces the chance of hitting the public API's 50 req/min
 * rate limit.
 */
async function fetchCoinGeckoPriceBatch(coinIds: ReadonlyArray<string>): Promise<CoinGeckoBatchPayload> {
  const now = Date.now();
  if (coingeckoBatchCache && now - coingeckoBatchCache.timestamp < CACHE_TTL) {
    return coingeckoBatchCache.data;
  }
  if (coingeckoBatchInFlight) return coingeckoBatchInFlight;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(
    ","
  )}&vs_currencies=usd&include_24hr_change=true`;

  coingeckoBatchInFlight = (async () => {
    const response = await fetchWithTimeout(url, { headers: COMMON_HEADERS });
    if (response.status === 429) {
      throw new Error("CoinGecko rate limited (429)");
    }
    if (!response.ok) {
      throw new Error(`CoinGecko price HTTP ${response.status}`);
    }
    const payload = (await response.json()) as CoinGeckoBatchPayload;
    coingeckoBatchCache = { data: payload, timestamp: Date.now() };
    return payload;
  })().finally(() => {
    coingeckoBatchInFlight = null;
  });

  return coingeckoBatchInFlight;
}

export async function getCoinGeckoMarketData(
  coinId: "bitcoin" | "ethereum",
  displaySymbol: "BTC" | "ETH"
): Promise<NormalizedMarketData> {
  const cacheKey = `coingecko:${coinId}`;
  return withCache(cacheKey, async () => {
    const historyUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=30&interval=daily`;

    const [batch, historyResponse] = await Promise.all([
      fetchCoinGeckoPriceBatch(["bitcoin", "ethereum"]),
      fetchWithTimeout(historyUrl, { headers: COMMON_HEADERS }),
    ]);

    if (historyResponse.status === 429) {
      throw new Error(errorMessage("CoinGecko history rate limited", displaySymbol, "status 429"));
    }
    if (!historyResponse.ok) {
      throw new Error(
        errorMessage(
          "CoinGecko history HTTP error",
          displaySymbol,
          `status ${historyResponse.status}`
        )
      );
    }

    const coinPriceData = batch?.[coinId];
    if (!coinPriceData) {
      throw new Error(errorMessage("CoinGecko missing coin in batch", displaySymbol, coinId));
    }

    const price = safeNumber(coinPriceData.usd, Number.NaN);
    const changePercent = safeNumber(coinPriceData.usd_24h_change, Number.NaN);
    if (!Number.isFinite(price)) {
      throw new Error(errorMessage("CoinGecko missing price", displaySymbol));
    }

    const safeChangePercent = Number.isFinite(changePercent) ? changePercent : 0;
    const denominator = 1 + safeChangePercent / 100;
    const previousClose = denominator !== 0 ? price / denominator : price;
    const change = price - previousClose;

    let historyPayload: unknown;
    try {
      historyPayload = await historyResponse.json();
    } catch (err) {
      throw new Error(
        errorMessage(
          "Invalid CoinGecko history JSON",
          displaySymbol,
          err instanceof Error ? err.message : "parse failed"
        )
      );
    }
    const historyData = historyPayload as { prices?: unknown[] };
    const rawHistory = Array.isArray(historyData?.prices)
      ? historyData.prices.map((entry) => (Array.isArray(entry) ? entry[1] : undefined))
      : [];

    return buildSafeMarketData({
      symbol: coinId,
      displaySymbol,
      source: "coingecko",
      price,
      previousClose,
      change,
      changePercent: safeChangePercent,
      history: rawHistory,
      updatedAt: Date.now(),
    });
  });
}

/**
 * Per-asset fetchers. They DO NOT swallow errors anymore — `getAllMarketData`
 * uses Promise.allSettled to capture per-asset failures into `errors[]` and
 * substitute a fallback object so the UI keeps working.
 */
export async function getStock(symbol: "AAPL" | "NVDA" | "TSLA"): Promise<NormalizedMarketData> {
  switch (symbol) {
    case "AAPL":
      return getYahooMarketData("AAPL", "AAPL");
    case "NVDA":
      return getYahooMarketData("NVDA", "NVDA");
    case "TSLA":
      return getYahooMarketData("TSLA", "TSLA");
    default:
      throw new Error(`Unsupported stock symbol: ${String(symbol)}`);
  }
}

export async function getIndex(symbol: "NIFTY" | "GOLD"): Promise<NormalizedMarketData> {
  switch (symbol) {
    case "NIFTY":
      return getYahooMarketData("^NSEI", "NIFTY");
    case "GOLD":
      return getYahooMarketData("GC=F", "GOLD");
    default:
      throw new Error(`Unsupported index symbol: ${String(symbol)}`);
  }
}

export async function getCrypto(symbol: "BTC" | "ETH"): Promise<NormalizedMarketData> {
  switch (symbol) {
    case "BTC":
      return getCoinGeckoMarketData("bitcoin", "BTC");
    case "ETH":
      return getCoinGeckoMarketData("ethereum", "ETH");
    default:
      throw new Error(`Unsupported crypto symbol: ${String(symbol)}`);
  }
}

export const MARKET_ASSETS = [
  { symbol: "BTC", type: "crypto" },
  { symbol: "ETH", type: "crypto" },
  { symbol: "AAPL", type: "stock" },
  { symbol: "NVDA", type: "stock" },
  { symbol: "TSLA", type: "stock" },
  { symbol: "NIFTY", type: "index" },
  { symbol: "GOLD", type: "index" },
] as const;

type MarketAsset = (typeof MARKET_ASSETS)[number];

async function fetchAsset(asset: MarketAsset): Promise<NormalizedMarketData> {
  if (asset.type === "stock") {
    return getStock(asset.symbol as "AAPL" | "NVDA" | "TSLA");
  }
  if (asset.type === "index") {
    return getIndex(asset.symbol as "NIFTY" | "GOLD");
  }
  return getCrypto(asset.symbol as "BTC" | "ETH");
}

export async function getAllMarketData(): Promise<{
  assets: NormalizedMarketData[];
  errors: MarketDataError[];
  updatedAt: number;
}> {
  const start = Date.now();
  const settled = await Promise.allSettled(MARKET_ASSETS.map((asset) => fetchAsset(asset)));

  const assets: NormalizedMarketData[] = [];
  const errors: MarketDataError[] = [];
  const succeeded: string[] = [];
  const failed: { symbol: string; error: string }[] = [];

  settled.forEach((result, index) => {
    const symbol = MARKET_ASSETS[index].symbol;
    if (result.status === "fulfilled") {
      const data = buildSafeMarketData(result.value);
      assets.push(data);
      if (data.isFallback) {
        failed.push({ symbol, error: "served-from-fallback" });
      } else {
        succeeded.push(symbol);
      }
      return;
    }
    const message =
      result.reason instanceof Error ? result.reason.message : "Unknown market data error";
    errors.push({ symbol, error: message });
    failed.push({ symbol, error: message });
    const source = MARKET_ASSETS[index].type === "crypto" ? "coingecko" : "yahoo";
    assets.push(buildFallbackMarketData(symbol, symbol, source));
  });

  // Temporary debug logging (no secrets) — visible in server logs only.
  const elapsed = Date.now() - start;
  console.info(
    `[market] fetched ${succeeded.length}/${MARKET_ASSETS.length} ok in ${elapsed}ms; ok=[${succeeded.join(
      ","
    )}]`
  );
  if (failed.length > 0) {
    for (const f of failed) {
      console.warn(`[market] ${f.symbol} failed: ${f.error}`);
    }
  }

  return {
    assets,
    errors,
    updatedAt: Date.now(),
  };
}
