const createNextIntlPlugin = require("next-intl/plugin");
const { withSentryConfig } = require("@sentry/nextjs");

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// In dev we proxy /api, /oauth2, /login/oauth2 through Next so the SPA stays same-origin against
// localhost:3001. In prod (Vercel), the frontend calls the backend directly using
// NEXT_PUBLIC_API_BASE (e.g. https://kurl.md) — no rewrites needed and short URLs live on the
// backend apex, not on the SPA host.
const BACKEND = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * Lighthouse "Best Practices" 가 요구하는 보안 헤더 묶음. 풀 CSP 와 Trusted Types 는 React/Next
 * 의 인라인 동작 + 3rd party (Sentry / PostHog / Google OAuth / Vercel) 호환성 위험 커서
 * 우선 제외. clickjacking / HSTS / COOP / MIME sniff / Referrer 만 강제 — 모두 회귀 위험 거의
 * 없는 항목.
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      { source: "/api/v1/:path*", destination: `${BACKEND}/api/v1/:path*` },
      { source: "/oauth2/:path*", destination: `${BACKEND}/oauth2/:path*` },
      { source: "/login/oauth2/:path*", destination: `${BACKEND}/login/oauth2/:path*` },
      { source: "/:code([0-9A-Za-z]{3,16})", destination: `${BACKEND}/:code` },
    ];
  },
};

module.exports = withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
