import "server-only";

/**
 * Lightweight in-memory rate limiter for Next.js route handlers and middleware.
 *
 * Production note (OWASP API4:2023 - Unrestricted Resource Consumption):
 * In a multi-instance / serverless deployment, this in-memory store is NOT shared
 * across instances. For production, swap `MemoryStore` for a distributed store
 * (Redis, Upstash, Cloudflare KV, DynamoDB, etc.). The `RateLimiterStore`
 * interface below is designed to be drop-in compatible.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export interface RateLimiterStore {
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

class MemoryStore implements RateLimiterStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  private lastSweep = 0;

  async hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    this.maybeSweep(now);

    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      return fresh;
    }
    existing.count += 1;
    return existing;
  }

  private maybeSweep(now: number): void {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

const defaultStore: RateLimiterStore = new MemoryStore();

export interface RateLimitOptions {
  /** Max requests allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Optional namespace, useful when multiple limiters share a store. */
  namespace?: string;
  /** Override store (e.g. Redis adapter in production). */
  store?: RateLimiterStore;
}

export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const store = options.store ?? defaultStore;
  const key = `${options.namespace ?? "default"}:${identifier}`;
  const { count, resetAt } = await store.hit(key, options.windowMs);
  const allowed = count <= options.limit;
  const remaining = Math.max(0, options.limit - count);
  const retryAfterSeconds = Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));

  return {
    allowed,
    limit: options.limit,
    remaining,
    resetAt,
    retryAfterSeconds,
  };
}

/**
 * Best-effort client identifier extraction.
 *
 * Trusts the left-most entry in `x-forwarded-for` only. In production behind a
 * known proxy you should validate this header (or use a trusted-proxy list /
 * platform header such as `cf-connecting-ip` or Vercel's `x-real-ip`).
 */
export function getClientIdentifier(request: Request): string {
  const headers = request.headers;
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  ];
  for (const candidate of candidates) {
    if (candidate && candidate.length > 0 && candidate.length < 64) {
      return candidate;
    }
  }
  return "anonymous";
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.allowed ? {} : { "Retry-After": String(result.retryAfterSeconds) }),
  };
}

/** Sensible defaults for different route classes. Tweak per route as needed. */
export const RATE_LIMIT_PRESETS = {
  /** Public, read-only data endpoints (e.g. /api/market). */
  publicRead: { limit: 60, windowMs: 60_000 },
  /** Login / auth endpoints — strict to slow brute-force (OWASP A07). */
  auth: { limit: 5, windowMs: 60_000 },
  /** AI / chat endpoints — cost-sensitive. */
  ai: { limit: 20, windowMs: 60_000 },
  /** Booking / contact form submissions. */
  booking: { limit: 10, windowMs: 60_000 },
  /** File / CSV uploads. */
  upload: { limit: 5, windowMs: 60_000 },
  /** Generic write endpoints. */
  write: { limit: 30, windowMs: 60_000 },
} as const;
