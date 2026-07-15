const createNextIntlPlugin = require("next-intl/plugin");
const { withSentryConfig } = require("@sentry/nextjs");

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// In dev we proxy /api, /oauth2, /login/oauth2 through Next so the SPA stays same-origin against
// localhost:3001. In prod (Vercel), the frontend calls the backend directly using
// NEXT_PUBLIC_API_BASE (e.g. https://kurl.md) — no rewrites needed and short URLs live on the
// backend apex, not on the SPA host.
const BACKEND = process.env.BACKEND_URL || "http://localhost:8080";

// The e2e lane builds the SPA (`npm run build`) and serves it with `npm start` — a production
// server where `NODE_ENV === "production"`. Without a flag the proxy rewrites below would return
// `[]`, so Playwright's same-origin calls to `/api/*` would never reach the backend and the full
// backend lane would silently pass nothing. Setting `E2E=1` re-enables the proxy for that run only;
// a real Vercel deploy never sets it, so production behaviour is unchanged.
const PROXY_BACKEND = process.env.NODE_ENV === "development" || process.env.E2E === "1";

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
  // The Tiptap v3 drag-handle packages ship ESM that Next's server bundler mis-resolves
  // ("__webpack_modules__[moduleId] is not a function") unless transpiled here.
  transpilePackages: [
    "@tiptap/extension-drag-handle-react",
    "@tiptap/extension-drag-handle",
    "@tiptap/extension-node-range",
  ],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // kurl.blog = 블로그의 "부르기 좋은 입구"(명함·구두·SNS) — 캐노니컬은 blog.kurl.me 그대로 두고
  // 영구 리다이렉트만 한다(별칭 결정 2026-07-15: 도메인을 옮기면 .kurl.me 공유 쿠키 SSO·SEO가
  // 전부 딸려오므로 이전이 아니라 별칭). config redirects 는 middleware 보다 먼저 돌아서 locale
  // 리다이렉트와 얽히지 않는다. 도메인이 Vercel 프로젝트에 붙기 전에는 이 host 로 요청이 올 일이
  // 없으니 미리 심어둬도 무해.
  async redirects() {
    return ["kurl.blog", "www.kurl.blog"].map((host) => ({
      source: "/:path*",
      has: [{ type: "host", value: host }],
      destination: "https://blog.kurl.me/:path*",
      permanent: true,
    }));
  },
  async rewrites() {
    if (!PROXY_BACKEND) return [];
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
