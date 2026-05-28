/**
 * kurl Subdomain Publishing Worker.
 *
 * `*.kurl.me/*` 요청을 Vercel 의 Next.js 프런트엔드로 proxy. 원래 host (예: john.kurl.me
 * 또는 blog.kurl.me) 는 X-Original-Host 헤더로 전달 → Next.js middleware 가 host 별 분기:
 *   - author subdomain ({username}.kurl.me) → /p/{username}/* internal rewrite
 *   - blog.kurl.me → /blog/* internal rewrite (C-plus product surface)
 *
 * Vercel Hobby 의 wildcard domain 미지원 우회 — Vercel 는 자기 default deployment URL 만 보고,
 * 본 Worker 가 subdomain 정보를 헤더로 propagate.
 *
 * 무시 (pass through to default CF routing):
 *   - 예약 시스템 subdomain (www / app / api / origin / admin / help / status / mail /
 *     kurl / official). app 은 DNS only (CF 안 거침), 나머지는 Proxied (CF 안에서 EC2 backend 행).
 *   - .kurl.me 가 아닌 host (defensive — route config 상 보통 안 옴)
 *
 * Worker route: `*.kurl.me/*` (wrangler.toml).
 *
 * Decision: [[decisions/2026-05-29-product-surface-c-lite]]
 */

const VERCEL_DEPLOYMENT_HOST = "short-link-frontend-blond.vercel.app";

const KURL_DOMAIN_SUFFIX = ".kurl.me";

// 시스템 subdomain — Vercel 로 forward 안 함. blog 는 C-plus product 라 reserved 에서 제외.
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "origin",
  "admin",
  "help",
  "status",
  "mail",
  "kurl",
  "official",
]);

export interface Env {}

export default {
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    // Defensive: route 설정 상 *.kurl.me 만 와야 함. 그 외는 default origin 으로.
    if (!host.endsWith(KURL_DOMAIN_SUFFIX)) {
      return fetch(request);
    }

    const subdomain = host.slice(0, -KURL_DOMAIN_SUFFIX.length);

    // Apex `kurl.me` 자체는 별도 Worker (kurl-router) 가 처리. 본 Worker route 가
    // `*.kurl.me/*` 라 apex 는 안 옴. defensive 분기.
    if (!subdomain || subdomain === "kurl") {
      return fetch(request);
    }

    // Multi-level subdomain (foo.bar.kurl.me) 는 wildcard cert (Universal SSL 1-level)
    // 범위 밖. 차단.
    if (subdomain.includes(".")) {
      return new Response("Subdomain depth not supported", { status: 404 });
    }

    // 예약 subdomain — default CF routing 으로 (Proxied 인 경우 EC2, DNS only 인 경우 직접).
    if (RESERVED_SUBDOMAINS.has(subdomain)) {
      return fetch(request);
    }

    // Wildcard subdomain (john.kurl.me 등) — Vercel 로 proxy.
    const vercelUrl = `https://${VERCEL_DEPLOYMENT_HOST}${url.pathname}${url.search}`;

    const headers = new Headers(request.headers);
    headers.set("X-Original-Host", host);
    // host 헤더 제거: fetch 가 vercelUrl 기반으로 자동 설정 (Vercel 가 default domain 으로 인식).
    headers.delete("host");

    return fetch(vercelUrl, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    });
  },
};
