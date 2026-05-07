/** @type {import('next').NextConfig} */

/**
 * OWASP-aligned security headers (A05:2021 - Security Misconfiguration).
 *
 * NOTE on CSP: 'unsafe-inline' is intentionally allowed for scripts/styles
 * because Next.js' runtime + framer-motion + Tailwind currently rely on inline
 * scripts/styles. To tighten further, migrate to a nonce-based CSP using
 * Next.js middleware (see Next.js docs). The rest of the directives are
 * already strict (no third-party origins, frame-ancestors 'none', etc.).
 */
const isProd = process.env.NODE_ENV === "production";

const cspDirectives = [
  "default-src 'self'",
  // 'unsafe-eval' is needed by Next dev/HMR; we keep it for prod too because
  // some animation libs use Function-based runtime evaluation. Remove if the
  // app moves to a nonce-based CSP.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self'",
  "upgrade-insecure-requests",
];

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // HSTS only meaningful over HTTPS; harmless to send.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const apiNoIndexHeaders = [
  { key: "Cache-Control", value: "no-store, max-age=0" },
  { key: "X-Robots-Tag", value: "noindex" },
];

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [...securityHeaders, ...apiNoIndexHeaders],
      },
    ];
  },
};

export default nextConfig;
