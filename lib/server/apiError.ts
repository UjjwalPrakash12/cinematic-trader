import "server-only";
import { NextResponse } from "next/server";

/**
 * Safe API error responder (OWASP A05:2021 - Security Misconfiguration,
 * A09:2021 - Security Logging and Monitoring Failures).
 *
 *   - never returns stack traces, internal paths, or upstream error bodies to
 *     the client
 *   - logs the full error server-side with a correlation id so operators can
 *     trace it without exposing it to users
 *   - sets `Cache-Control: no-store` and a basic set of API hardening headers
 */

/**
 * Cache-Control, X-Content-Type-Options, Referrer-Policy and X-Robots-Tag are
 * already applied to every `/api/:path*` response by `next.config.mjs`. We
 * still set `Cache-Control` here as a defense-in-depth fallback in case the
 * response leaves through a path that bypasses the global headers (e.g.
 * direct middleware short-circuits during failure modes).
 */
const API_NO_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, max-age=0",
};

export interface ApiErrorOptions {
  status?: number;
  publicMessage?: string;
  /** Extra structured data to send back (must not contain sensitive info). */
  details?: Record<string, unknown>;
  /** Headers to merge in (e.g. rate-limit headers). */
  headers?: Record<string, string>;
  /** Optional correlation id; one is generated if omitted. */
  correlationId?: string;
}

const STATUS_DEFAULT_MESSAGES: Record<number, string> = {
  400: "Bad request.",
  401: "Authentication required.",
  403: "Forbidden.",
  404: "Not found.",
  405: "Method not allowed.",
  408: "Request timeout.",
  409: "Conflict.",
  413: "Payload too large.",
  415: "Unsupported media type.",
  422: "Unprocessable request.",
  429: "Too many requests. Please try again later.",
  500: "Something went wrong. Please try again.",
  503: "Service temporarily unavailable.",
};

function generateCorrelationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function apiErrorResponse(
  errorOrMessage: unknown,
  options: ApiErrorOptions = {}
): NextResponse {
  const status = options.status ?? 500;
  const correlationId = options.correlationId ?? generateCorrelationId();
  const publicMessage =
    options.publicMessage ?? STATUS_DEFAULT_MESSAGES[status] ?? "Something went wrong.";

  // Server-side logging only — never echoed to the client.
  const detail = errorOrMessage instanceof Error ? errorOrMessage.stack ?? errorOrMessage.message : String(errorOrMessage);
  console.error(`[api-error] ${correlationId} status=${status} :: ${detail}`);

  return NextResponse.json(
    {
      error: publicMessage,
      correlationId,
      ...(options.details ?? {}),
    },
    {
      status,
      headers: { ...API_NO_CACHE_HEADERS, ...(options.headers ?? {}) },
    }
  );
}

export function apiSuccessHeaders(extra?: Record<string, string>): Record<string, string> {
  return { ...API_NO_CACHE_HEADERS, ...(extra ?? {}) };
}
