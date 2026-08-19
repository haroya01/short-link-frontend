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
  // same-origin(강)은 Apple 웹 로그인 팝업(web_message)의 opener 관계를 끊어 로그인 자체를
  // 죽였다 — allow-popups 는 "남이 우리를 여는" XS-Leak 방어는 유지하면서 우리가 연 OAuth
  // 팝업과의 postMessage 채널만 살린다(OAuth 팝업 표준 처방).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // 목록 썸네일 최적화(next/image) 허용 호스트 — 커버가 실제로 사는 곳만 연다('**' 금지:
  // 임의 호스트 프록시는 최적화 비용 악용 표면). 목록 밖 호스트는 CoverThumb 가 원본
  // <img> 로 폴백한다. ※ modules/blog/lib/optimized-image.ts 의 허용목록과 같이 바꿀 것.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "d82putaebkgm4.cloudfront.net" },
      { protocol: "https", hostname: "qiita-image-store.s3.ap-northeast-1.amazonaws.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
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
    // Pretendard 를 자사 도메인으로 프록시 — jsdelivr 서드파티 연결(DNS+TLS+RTT, 모바일
    // 스로틀에서 ~0.6-0.9s)을 제거하고 폰트 도착 시점을 안정화한다(LCP 재기록 지터의 진범).
    // CSS 안의 상대 woff2 경로(./woff2-dynamic-subset/…)도 같은 프리픽스로 풀려 함께 프록시된다.
    // jsdelivr 는 immutable 캐시 헤더를 주므로 Vercel 엣지가 그대로 캐시한다.
    const fontProxy = [
      {
        source: "/pretendard/:path*",
        destination:
          "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/:path*",
      },
    ];
    if (!PROXY_BACKEND) return fontProxy;
    return [
      ...fontProxy,
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
