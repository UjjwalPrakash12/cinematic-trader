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
}

export interface MarketDataError {
  symbol: string;
  error: string;
}

const CACHE_TTL = 30_000;

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
    history: [0, 0],
    updatedAt: Date.now(),
  });
}

function errorMessage(prefix: string, displaySymbol: string, detail?: string): string {
  return `${prefix} for ${displaySymbol}${detail ? `: ${detail}` : ""}`;
}

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

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        errorMessage("Failed to fetch Yahoo data", displaySymbol, `status ${response.status}`)
      );
    }

    const payload: unknown = await response.json();
    const chart = payload as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: unknown; previousClose?: unknown };
          indicators?: { quote?: Array<{ close?: unknown[] }> };
        }>;
      };
    };

    const result = Array.isArray(chart.chart?.result) ? chart.chart?.result?.[0] : undefined;
    const meta = result?.meta;
    const quote = Array.isArray(result?.indicators?.quote) ? result?.indicators?.quote?.[0] : undefined;
    if (!result || !meta) {
      throw new Error(errorMessage("Invalid Yahoo response shape", displaySymbol));
    }

    const price = safeNumber(meta.regularMarketPrice, Number.NaN);
    const previousClose = safeNumber(meta.previousClose, Number.NaN);
    if (!Number.isFinite(price) || !Number.isFinite(previousClose)) {
      throw new Error(errorMessage("Invalid Yahoo price fields", displaySymbol));
    }

    return buildSafeMarketData({
      symbol: yahooSymbol,
      displaySymbol,
      source: "yahoo",
      price,
      previousClose,
      change: price - previousClose,
      changePercent: previousClose !== 0 ? ((price - previousClose) / previousClose) * 100 : 0,
      history: quote?.close ?? [],
      updatedAt: Date.now(),
    });
  });
}

export async function getCoinGeckoMarketData(
  coinId: "bitcoin" | "ethereum",
  displaySymbol: "BTC" | "ETH"
): Promise<NormalizedMarketData> {
  const cacheKey = `coingecko:${coinId}`;
  return withCache(cacheKey, async () => {
    const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`;
    const historyUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=30&interval=daily`;

    const [priceResponse, historyResponse] = await Promise.all([
      fetch(priceUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
      }),
      fetch(historyUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
      }),
    ]);

    if (!priceResponse.ok) {
      throw new Error(
        errorMessage(
          "Failed to fetch CoinGecko price data",
          displaySymbol,
          `status ${priceResponse.status}`
        )
      );
    }
    if (!historyResponse.ok) {
      throw new Error(
        errorMessage(
          "Failed to fetch CoinGecko history data",
          displaySymbol,
          `status ${historyResponse.status}`
        )
      );
    }

    const [pricePayload, historyPayload] = (await Promise.all([
      priceResponse.json(),
      historyResponse.json(),
    ])) as [unknown, unknown];

    const priceData = pricePayload as Record<string, { usd?: unknown; usd_24h_change?: unknown }>;
    const coinPriceData = priceData?.[coinId];
    if (!coinPriceData) {
      throw new Error(errorMessage("Invalid CoinGecko price response", displaySymbol));
    }

    const price = safeNumber(coinPriceData.usd, Number.NaN);
    const changePercent = safeNumber(coinPriceData.usd_24h_change, Number.NaN);
    if (!Number.isFinite(price) || !Number.isFinite(changePercent)) {
      throw new Error(errorMessage("Invalid CoinGecko price fields", displaySymbol));
    }

    const denominator = 1 + changePercent / 100;
    const previousClose = denominator !== 0 ? price / denominator : price;
    const change = price - previousClose;

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
      changePercent,
      history: rawHistory,
      updatedAt: Date.now(),
    });
  });
}

export async function getStock(symbol: "AAPL" | "NVDA" | "TSLA"): Promise<NormalizedMarketData> {
  try {
    switch (symbol) {
      case "AAPL":
        return await getYahooMarketData("AAPL", "AAPL");
      case "NVDA":
        return await getYahooMarketData("NVDA", "NVDA");
      case "TSLA":
        return await getYahooMarketData("TSLA", "TSLA");
      default:
        return buildFallbackMarketData(symbol, symbol, "yahoo");
    }
  } catch {
    return buildFallbackMarketData(symbol, symbol, "yahoo");
  }
}

export async function getIndex(symbol: "NIFTY" | "GOLD"): Promise<NormalizedMarketData> {
  try {
    switch (symbol) {
      case "NIFTY":
        return await getYahooMarketData("^NSEI", "NIFTY");
      case "GOLD":
        return await getYahooMarketData("GC=F", "GOLD");
      default:
        return buildFallbackMarketData(symbol, symbol, "yahoo");
    }
  } catch {
    return buildFallbackMarketData(symbol, symbol, "yahoo");
  }
}

export async function getCrypto(symbol: "BTC" | "ETH"): Promise<NormalizedMarketData> {
  try {
    switch (symbol) {
      case "BTC":
        return await getCoinGeckoMarketData("bitcoin", "BTC");
      case "ETH":
        return await getCoinGeckoMarketData("ethereum", "ETH");
      default:
        return buildFallbackMarketData(symbol, symbol, "coingecko");
    }
  } catch {
    return buildFallbackMarketData(symbol, symbol, "coingecko");
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
  const settled = await Promise.allSettled(MARKET_ASSETS.map((asset) => fetchAsset(asset)));

  const assets: NormalizedMarketData[] = [];
  const errors: MarketDataError[] = [];

  settled.forEach((result, index) => {
    const symbol = MARKET_ASSETS[index].symbol;
    if (result.status === "fulfilled") {
      assets.push(buildSafeMarketData(result.value));
      return;
    }
    const message =
      result.reason instanceof Error ? result.reason.message : "Unknown market data error";
    errors.push({ symbol, error: message });
    const source = MARKET_ASSETS[index].type === "crypto" ? "coingecko" : "yahoo";
    assets.push(buildFallbackMarketData(symbol, symbol, source));
  });

  return {
    assets,
    errors,
    updatedAt: Date.now(),
  };
}
