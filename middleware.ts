import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Cloudflare Worker 가 *.kurl.me 요청을 Vercel 로 proxy 할 때 set 하는 헤더.
// 값 예시: "john.kurl.me". 이 헤더 있으면 publishing subdomain 요청으로 인식.
const ORIGINAL_HOST_HEADER = "x-original-host";

// kurl.me / app.kurl.me / api.kurl.me 같은 시스템 host 는 publishing rewrite 대상 X.
// 백엔드 (kurl.me) 의 Worker 가 이런 host 는 애초에 forward 안 함. 방어적으로 frontend 에서도
// 같은 reserved 리스트 유지.
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "origin",
  "admin",
  "blog",
  "help",
  "status",
  "mail",
  "kurl",
  "official",
]);

function extractSubdomain(host: string | null): string | null {
  if (!host) return null;
  const cleaned = host.toLowerCase().split(":")[0]; // strip port
  if (!cleaned.endsWith(".kurl.me")) return null;
  const sub = cleaned.slice(0, -".kurl.me".length);
  if (!sub || sub === "kurl") return null;
  if (sub.includes(".")) return null; // multi-level subdomain (foo.bar.kurl.me) — not supported
  if (RESERVED_SUBDOMAINS.has(sub)) return null;
  return sub;
}

// UI chrome locale (작성자의 게시 글 자체는 post.languageTag 로 별도 lang attr).
// Worker 가 Accept-Language 기반으로 선택해서 헤더 전달하는 옵션도 가능하지만, 우선 default.
const DEFAULT_PUBLISHING_LOCALE = routing.defaultLocale;

export default function middleware(req: NextRequest) {
  const originalHost = req.headers.get(ORIGINAL_HOST_HEADER);
  const subdomain = extractSubdomain(originalHost);

  if (subdomain) {
    // *.kurl.me publishing request.
    // path '/' → /{locale}/p/{username}
    // path '/article-slug' → /{locale}/p/{username}/article-slug
    // Publishing routes 가 [locale] 안에 있어서 default locale prefix 부여 (UI chrome 만).
    const url = req.nextUrl.clone();
    const path = url.pathname;
    const target =
      path === "/"
        ? `/${DEFAULT_PUBLISHING_LOCALE}/p/${subdomain}`
        : `/${DEFAULT_PUBLISHING_LOCALE}/p/${subdomain}${path}`;
    url.pathname = target;
    return NextResponse.rewrite(url);
  }

  // 일반 frontend host (app.kurl.me 등) — 기존 next-intl 처리
  return intlMiddleware(req);
}

export const config = {
  // Run middleware on every request that isn't an asset, API, or OAuth callback. The previous
  // exclusion of {@code [0-9A-Za-z]{3,16}$} (short-code paths) is gone now that the kurl.me
  // Cloudflare Worker routes those to the backend before they ever reach Next.js — keeping
  // the exclusion was silently breaking locale redirects for reserved frontend paths that
  // happened to fit the 3-16 alnum pattern (/showcase, /about, /login, /pricing → all 404'd
  // because middleware skipped them and `/showcase` doesn't exist without the locale prefix).
  matcher: [
    "/((?!api|_next|_vercel|favicon.ico|.*\\..*|oauth2|login/oauth2|monitoring).*)",
  ],
};
