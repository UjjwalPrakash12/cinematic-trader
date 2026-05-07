import { NextRequest, NextResponse } from "next/server";
import {
  RATE_LIMIT_PRESETS,
  checkRateLimit,
  getClientIdentifier,
  rateLimitHeaders,
  type RateLimitOptions,
} from "@/lib/server/rateLimit";

/**
 * Edge middleware — applies a baseline rate limit and basic API hygiene to
 * every `/api/*` request before it reaches a route handler. Per-route
 * handlers can apply STRICTER limits (e.g. login = 5/min) on top of this
 * floor.
 *
 * Defense-in-depth (OWASP API4:2023 - Unrestricted Resource Consumption,
 *                    OWASP API8:2023 - Security Misconfiguration).
 */

export const config = {
  matcher: ["/api/:path*"],
};

const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 MB default per request body
const MAX_URL_LENGTH = 2048;

function pickRouteLimits(pathname: string): RateLimitOptions {
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/login") || pathname.startsWith("/api/admin")) {
    return { ...RATE_LIMIT_PRESETS.auth, namespace: "auth" };
  }
  if (pathname.startsWith("/api/ai") || pathname.startsWith("/api/chat")) {
    return { ...RATE_LIMIT_PRESETS.ai, namespace: "ai" };
  }
  if (pathname.startsWith("/api/booking") || pathname.startsWith("/api/contact")) {
    return { ...RATE_LIMIT_PRESETS.booking, namespace: "booking" };
  }
  if (pathname.startsWith("/api/upload") || pathname.includes("csv")) {
    return { ...RATE_LIMIT_PRESETS.upload, namespace: "upload" };
  }
  return { ...RATE_LIMIT_PRESETS.publicRead, namespace: "public" };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  if (!ALLOWED_METHODS.has(method)) {
    return jsonError(405, "Method not allowed.");
  }

  if (request.url.length > MAX_URL_LENGTH) {
    return jsonError(414, "Request URI too long.");
  }

  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return jsonError(413, "Payload too large.");
    }
  }

  const limits = pickRouteLimits(pathname);
  const identifier = getClientIdentifier(request);
  const result = await checkRateLimit(identifier, limits);
  const limitHeaders = rateLimitHeaders(result);

  if (!result.allowed) {
    return jsonError(429, "Too many requests. Please slow down.", limitHeaders);
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(limitHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

function jsonError(
  status: number,
  message: string,
  extraHeaders?: Record<string, string>
): NextResponse {
  // Middleware short-circuits do not always pass through the route-level
  // `headers()` config in next.config.mjs, so we set the no-cache fallback
  // explicitly here. Other security headers are still applied by Next.js.
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        ...(extraHeaders ?? {}),
      },
    }
  );
}
