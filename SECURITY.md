# Security Posture & Hardening Checklist

This document records the OWASP-aligned hardening applied to the Cinematic
Trader codebase, and the operational guidance that should accompany any new
endpoints / features added to it.

> **Scope reality check.** At the time of this audit, the project consists of:
>
> - One public API route: `GET /api/market` (proxies public Yahoo Finance +
>   CoinGecko data, no authentication, no PII).
> - One client-side AI chat panel (`components/AIPanel.tsx`) backed by a
>   rule-based responder in `lib/aiResponses.ts`. There is **no server-side AI
>   endpoint and no provider API key in this repository**.
> - **No** booking forms, login/admin routes, CSV / file upload endpoints,
>   environment variables in use, or `dangerouslySetInnerHTML`.
>
> Hardening was therefore applied to the surfaces that exist **and** to
> reusable primitives so any future endpoint inherits OWASP-aligned defaults.

---

## What was fixed and where

### 1. Rate limiting on all public endpoints — _OWASP API4:2023_

| Surface | Before | After | Where |
| --- | --- | --- | --- |
| Default for every `/api/*` request | None | Edge middleware applies a per-IP rate limit floor + method allow-list + 1 MB body cap + URL length cap | `middleware.ts` |
| `/api/market` (public read) | None | 60 req / minute / IP, with `X-RateLimit-*` and `Retry-After` headers, generic 429 on breach | `app/api/market/route.ts`, `lib/server/rateLimit.ts` |
| Login / admin (when added) | n/a | `RATE_LIMIT_PRESETS.auth` = 5 req / minute / IP, namespaced separately so it can't be diluted by other traffic | `lib/server/rateLimit.ts`, `middleware.ts` (`/api/auth/*`, `/api/login/*`, `/api/admin/*`) |
| AI / chat (when added) | n/a | `RATE_LIMIT_PRESETS.ai` = 20 req / minute / IP | `middleware.ts` (`/api/ai/*`, `/api/chat/*`) |
| Booking / contact (when added) | n/a | `RATE_LIMIT_PRESETS.booking` = 10 req / minute / IP | `middleware.ts` (`/api/booking/*`, `/api/contact/*`) |
| CSV / file upload (when added) | n/a | `RATE_LIMIT_PRESETS.upload` = 5 req / minute / IP | `middleware.ts` (`/api/upload/*`, `/api/*csv*`) |
| Client AI chat panel | None | Per-session 20 messages / minute cap with user-friendly cooldown message | `components/AIPanel.tsx` |

Production note: the in-memory store is per-instance. Swap `MemoryStore` in
`lib/server/rateLimit.ts` for a Redis / Upstash adapter implementing the
exported `RateLimiterStore` interface for multi-instance deployments.

### 2. Strict input validation and sanitization — _OWASP A03:2021 / A04:2021_

| Concern | Helper | Where |
| --- | --- | --- |
| Strip control / zero-width / bidi characters | `stripControlCharacters` | `lib/sanitize.ts` |
| Hard length cap + trim + control-char strip for free-form text | `sanitizeText` | `lib/sanitize.ts` |
| HTML-escape for any value interpolated into HTML | `escapeHtml` | `lib/sanitize.ts` |
| Heuristic block of `<script>`, `<iframe>`, … payloads | `looksLikeHtmlPayload` | `lib/sanitize.ts` |
| Reject unexpected fields, validate name/email/phone/message/date/time/guests | `validateBooking` | `lib/validation.ts` |
| Login validator with generic, non-leaky error | `validateLogin` | `lib/validation.ts` |
| Chatbot prompt validator (length, type, HTML payload reject) | `validateChatPrompt` | `lib/validation.ts` |
| CSV upload metadata guard (size / MIME / file-name pattern) | `validateCsvUploadMeta` | `lib/validation.ts` |
| CSV formula-injection neutralizer (`=`, `+`, `-`, `@`, …) | `neutralizeCsvCell` | `lib/validation.ts` |
| Client-side input cap, sanitization, and HTML-payload reject in chat panel | `MAX_PROMPT_LENGTH = 1000` + `sanitizeText` + `looksLikeHtmlPayload` | `components/AIPanel.tsx` |
| Defensive guard inside the AI responder | `getAIResponse` re-runs `sanitizeText` regardless of caller | `lib/aiResponses.ts` |

XSS posture: all chat content is rendered via React text children (no
`dangerouslySetInnerHTML`, no `innerHTML`, no `eval`, no `new Function` —
verified by repo grep), so React performs context-correct output encoding.

### 3. Secure API key handling — _OWASP A02:2021 / A05:2021_

| Item | Status |
| --- | --- |
| Hardcoded API keys in client code | **None found.** Repo grep for `api[_-]?key`, `secret`, `token`, `NEXT_PUBLIC_…`, provider names (OpenAI, Resend, SendGrid, Stripe, Firebase, Supabase, …) returned no real matches outside `package-lock.json`. |
| Hardcoded API keys in server code | **None found.** No `.env*` files are committed; `.gitignore` already excludes `.env`, `.env.local`, etc. |
| Provider keys exposed via `NEXT_PUBLIC_` / `VITE_` | **N/A** — no public env vars are used. Policy now documented. |
| Public env policy | Added `.env.example` documenting the rule: server secrets must NEVER be `NEXT_PUBLIC_`-prefixed; secrets live in route handlers, server actions, or `lib/server/**`. |
| Browser-side mailing / provider calls | None — all upstream fetches happen in `lib/server/marketData.ts` (marked `import "server-only"`); the browser only calls our own `/api/market`. |
| Rotation guidance | Added in `.env.example` and below. |

If a key is ever leaked: rotate it at the provider immediately, then update
the value in your hosting platform's env settings (Vercel, etc.). Do **not**
just remove the value from a committed file — git history retains it.

### 4. Admin / login protection — _OWASP A07:2021_

The repo currently has no auth surface, but the primitives are now in place
so the moment one is added it inherits the protections:

- `RATE_LIMIT_PRESETS.auth` (5 / min) is wired in `middleware.ts` for any
  path under `/api/auth`, `/api/login`, `/api/admin`.
- `validateLogin` in `lib/validation.ts` returns the **same generic error
  message** (`"Invalid email or password."`) regardless of which field
  failed, preventing username enumeration.
- `apiErrorResponse` returns a generic body (no stack traces, no internal
  paths) — see _Safe error handling_ below.
- Cookie / session guidance for when auth is added (do this in the same PR
  that introduces `/api/auth/*`):
  - `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict`) on session cookies.
  - Short-lived session tokens with refresh, plus server-side revocation list.
  - Server-side session check inside the route handler (or React Server
    Component) — never trust a client-side flag.
  - Use `POST` for login; rely on the auth-rate-limit preset above.

### 5. Safe error handling — _OWASP A05:2021 / A09:2021_

| Concern | Where |
| --- | --- |
| Generic, user-friendly error messages (no stack traces, no upstream bodies) | `lib/server/apiError.ts` (`apiErrorResponse`) |
| Correlation id returned to user, full error stack logged server-side only | `apiErrorResponse` (`console.error("[api-error] <id> :: <stack>")`) |
| Per-symbol error from upstream providers is replaced with a generic message before being sent to the browser | `app/api/market/route.ts` |
| `Cache-Control: no-store` + `X-Robots-Tag: noindex` on all API responses | `apiSuccessHeaders` + `next.config.mjs` `/api/:path*` |
| Client-side AI panel surfaces friendly errors instead of raw exceptions | `components/AIPanel.tsx` |

### 6. Network / transport hardening — _OWASP A05:2021_

Applied via `next.config.mjs` `headers()` to every route, with extra cache /
robots headers on `/api/:path*`:

- `Content-Security-Policy` — `default-src 'self'`, no third-party origins,
  `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `upgrade-insecure-requests`. (`'unsafe-inline'`
  remains for scripts/styles to keep Next.js + framer-motion working;
  migrate to a nonce-based CSP later if you want full strict-dynamic.)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — disables camera, microphone, geolocation, payment,
  USB, motion sensors, FLoC.
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `X-DNS-Prefetch-Control: off`
- `X-Permitted-Cross-Domain-Policies: none`
- `poweredByHeader: false` to drop the `X-Powered-By: Next.js` fingerprint.

### 7. Defense-in-depth middleware — _OWASP API4:2023 / A05:2021_

`middleware.ts` runs on the Edge for every `/api/*` request and:

- Rejects unknown HTTP methods with `405`.
- Rejects URLs longer than `2048` chars with `414`.
- Rejects `Content-Length > 1 MB` with `413` (DoS guard for any future POST).
- Applies a per-IP rate-limit floor (preset chosen by URL prefix).
- Forwards `X-RateLimit-*` headers downstream so the client can back off.

---

## Defaults recap

| Class | Limit | Source |
| --- | --- | --- |
| Public read (`/api/market`, default) | 60 / min / IP | `RATE_LIMIT_PRESETS.publicRead` |
| Auth (login / admin) | 5 / min / IP | `RATE_LIMIT_PRESETS.auth` |
| AI / chat | 20 / min / IP | `RATE_LIMIT_PRESETS.ai` |
| Booking / contact | 10 / min / IP | `RATE_LIMIT_PRESETS.booking` |
| Upload / CSV | 5 / min / IP | `RATE_LIMIT_PRESETS.upload` |
| Generic write | 30 / min / IP | `RATE_LIMIT_PRESETS.write` |
| Max request body | 1 MB | `middleware.ts` |
| Max URL length | 2048 chars | `middleware.ts` |
| Max chat prompt | 1000 chars | `components/AIPanel.tsx`, `lib/validation.ts`, `lib/aiResponses.ts` |
| Max booking message | 1000 chars | `lib/validation.ts` |
| Max CSV upload | 2 MB / `.csv` only | `lib/validation.ts` |

---

## How to add a new endpoint safely

1. Place the route under a path that triggers the right preset
   (`/api/auth/*`, `/api/ai/*`, `/api/booking/*`, `/api/upload/*`).
2. Inside the handler, parse the body with the matching validator from
   `lib/validation.ts` (or add one). Reject unexpected fields and apply
   length limits.
3. Wrap any failure path with `apiErrorResponse(error, { status, publicMessage })`
   so users only ever see a safe, generic message.
4. For stricter-than-baseline rate limiting, call `checkRateLimit(...)` in
   the handler with a route-specific namespace (see `app/api/market/route.ts`
   for an example).
5. For mutating routes (POST/PUT/DELETE), add an explicit method handler so
   unknown methods return `405` instead of `200` with empty bodies.

---

## Known follow-ups (out of scope for this audit)

- Migrate the rate-limit `MemoryStore` to a Redis / Upstash adapter for
  multi-instance / serverless deployments.
- Move CSP from `'unsafe-inline'` for scripts/styles to a nonce-based CSP
  using a Next.js middleware nonce + `Script` `nonce` attribute. (Requires
  rewiring framer-motion + Tailwind inline styles.)
- Add automated dependency-vulnerability scanning (`npm audit` in CI,
  Dependabot, or Snyk) — `package.json` is currently small and clean but
  this should be enforced going forward.
- Add `eslint-plugin-security` and `eslint-plugin-no-secrets` to CI to
  catch regressions on the secret-handling and validation rules above.
