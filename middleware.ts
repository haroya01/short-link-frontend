import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Mirror of FEED_TAB_COOKIE / FEED_TABS in modules/blog/api/feed-prefs.ts — re-declared here so the
// edge middleware doesn't pull the API client (and its mock layer) into its bundle. Keep in sync.
const FEED_TAB_COOKIE = "kurl_blog_default_tab";
const FEED_TAB_VALUES = new Set(["trending", "following", "series"]);

/**
 * Feed route split. The bare feed URL (/{locale}/blog) is a STATIC ISR page; every parameterized
 * view — ?sort/?q/?tag/?lang, or a visitor whose saved default-tab cookie isn't "recent" — is
 * served by the per-request ./browse sibling. Mutates `url` in place (pathname + sort param);
 * the visitor-facing URL never changes because these are rewrites.
 */
function routeFeedVariant(req: NextRequest, url: URL): void {
  if (!/^\/[a-z]{2}\/blog\/?$/.test(url.pathname)) return;
  const hasParams = ["sort", "q", "tag", "lang"].some((k) => url.searchParams.has(k));
  if (!hasParams) {
    const saved = req.cookies.get(FEED_TAB_COOKIE)?.value;
    if (!saved || !FEED_TAB_VALUES.has(saved)) return;
    url.searchParams.set("sort", saved);
  }
  url.pathname = `${url.pathname.replace(/\/$/, "")}/browse`;
}

// Cloudflare Worker 가 *.kurl.me 요청을 Vercel 로 proxy 할 때 set 하는 헤더.
const ORIGINAL_HOST_HEADER = "x-original-host";

// 작가 페이지 subdomain 에서 제외할 시스템 host.
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

const DEFAULT_LOCALE = routing.defaultLocale;
const SUPPORTED_LOCALES = routing.locales as readonly string[];
const LOCALE_RE = /^([a-z]{2})(\/.*)?$/;

/**
 * Pick the visitor's locale for a no-locale entry on a blog/author host (where we rewrite instead of
 * letting next-intl redirect, so its own detection never runs): a prior NEXT_LOCALE choice wins, then
 * the browser's Accept-Language, then the ko fallback. Keeps blog.kurl from forcing English on a
 * Japanese/Korean visitor while still honoring an explicit /en.
 */
function detectLocale(req: NextRequest): string {
  const cookie = req.cookies.get("NEXT_LOCALE")?.value;
  if (cookie && SUPPORTED_LOCALES.includes(cookie)) return cookie;
  const header = req.headers.get("accept-language");
  if (header) {
    for (const part of header.split(",")) {
      const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
      if (SUPPORTED_LOCALES.includes(code)) return code;
    }
  }
  return DEFAULT_LOCALE;
}

const BLOG_HOST_DEFAULT = "blog.kurl.me";
const BLOG_HOST_ENV = process.env.NEXT_PUBLIC_BLOG_HOST;

function cleanHost(host: string | null): string {
  return (host ?? "").toLowerCase().split(":")[0];
}

function extractAuthorSubdomain(host: string | null): string | null {
  const cleaned = cleanHost(host);
  if (!cleaned.endsWith(".kurl.me")) return null;
  const sub = cleaned.slice(0, -".kurl.me".length);
  if (!sub || sub.includes(".")) return null;
  if (RESERVED_SUBDOMAINS.has(sub)) return null;
  return sub;
}

function isBlogHost(host: string | null): boolean {
  const cleaned = cleanHost(host);
  if (cleaned === BLOG_HOST_DEFAULT) return true;
  if (BLOG_HOST_ENV && cleaned === BLOG_HOST_ENV.toLowerCase()) return true;
  return false;
}

/**
 * 옛 URL → 새 URL 308 redirect. Redirect 가 rewrite 보다 먼저.
 * Decision: [[decisions/2026-05-29-product-surface-c-lite]]
 */
function legacyRedirect(req: NextRequest, host: string): NextResponse | null {
  // blog.kurl.me 에서 들어온 요청은 이미 destination host. cross-domain redirect 호출하면
  // 같은 host 로 무한 loop. 옛 URL legacy redirect 는 kurl.me / default host 에서만 동작.
  if (cleanHost(host) === BLOG_HOST_DEFAULT) return null;

  const path = req.nextUrl.pathname;
  const search = req.nextUrl.search;

  // Canonical blog host: in production, send blog routes to blog.kurl.me. The blog workspace's
  // sidebar links are host-relative (only the blog host rewrites /{locale}/write →
  // /{locale}/blog/write), so on the apex they 404 / cross-origin-redirect and the RSC prefetch
  // errors out. Gated on VERCEL_ENV === "production" (not the host) because the apex kurl.me is
  // proxied by the kurl-router Worker, which reaches Next as the bare deployment host — so a host
  // check can't see "kurl.me". blog.kurl.me requests are already returned above (host guard), so
  // this can't loop; preview/dev have VERCEL_ENV preview/undefined and serve /{locale}/blog
  // directly. The generated OG image is excluded — scrapers may not follow a cross-host redirect.
  if (process.env.VERCEL_ENV === "production") {
    const blogMatch = path.match(/^\/([a-z]{2})\/blog(\/.*)?$/);
    if (blogMatch && !path.endsWith("/opengraph-image")) {
      const rest = blogMatch[2] || "/";
      return NextResponse.redirect(
        `https://${BLOG_HOST_DEFAULT}/${blogMatch[1]}${rest}${search}`,
        308,
      );
    }
  }

  // /{locale}/content/* → blog.kurl.me/{locale}/*
  const contentMatch = path.match(/^\/([a-z]{2})\/content(\/.*)?$/);
  if (contentMatch) {
    const sub = contentMatch[2] || "/";
    return NextResponse.redirect(
      `https://${BLOG_HOST_DEFAULT}/${contentMatch[1]}${sub}${search}`,
      308,
    );
  }

  // /{locale}/posts → blog.kurl.me/{locale}/
  const postsMatch = path.match(/^\/([a-z]{2})\/posts\/?$/);
  if (postsMatch) {
    return NextResponse.redirect(
      `https://${BLOG_HOST_DEFAULT}/${postsMatch[1]}/${search}`,
      308,
    );
  }

  // /{locale}/links/* → /{locale}/* (URL prefix 폐기)
  const linksSubMatch = path.match(/^\/([a-z]{2})\/links\/(.+)$/);
  if (linksSubMatch) {
    return NextResponse.redirect(
      new URL(`/${linksSubMatch[1]}/${linksSubMatch[2]}${search}`, req.url),
      308,
    );
  }

  // /{locale}/links → /{locale}/dashboard
  const linksRootMatch = path.match(/^\/([a-z]{2})\/links\/?$/);
  if (linksRootMatch) {
    return NextResponse.redirect(
      new URL(`/${linksRootMatch[1]}/dashboard${search}`, req.url),
      308,
    );
  }

  return null;
}

export default function middleware(req: NextRequest) {
  const originalHost = req.headers.get(ORIGINAL_HOST_HEADER);
  const reqHost = req.headers.get("host");
  const host = originalHost ?? reqHost;

  // 1. Redirect 가 rewrite 보다 먼저 (옛 URL). blog.kurl.me 진입은 skip.
  const redirect = legacyRedirect(req, host ?? "");
  if (redirect) return redirect;

  // 2. 유저 명함 — {username}.kurl.me/{anything} → /{locale}/u/{username}/{anything}
  // 서브도메인은 이제 링크인바이오(명함)다. 블로그 작가 프로필은 blog.kurl.me/@{username} 로 분리됨
  // (아래 blog-host 분기). 명함은 단일 페이지라 보통 root 만 의미가 있다.
  const authorSub = extractAuthorSubdomain(originalHost);
  if (authorSub) {
    const url = req.nextUrl.clone();
    const path = url.pathname;
    const loc = detectLocale(req);
    url.pathname = path === "/" ? `/${loc}/u/${authorSub}` : `/${loc}/u/${authorSub}${path}`;
    return NextResponse.rewrite(url);
  }

  // 3. blog.kurl.me — /{locale?}/foo → /{locale}/blog/foo rewrite. Detect an optional leading
  //    locale and preserve the FULL remaining path (encoding-safe slice). Previously a no-locale
  //    multi-segment path like /write or /randomword fell through to /{locale}/blog (the feed),
  //    so unknown paths showed the feed instead of 404 and /write/{id} lost its id.
  if (isBlogHost(originalHost) || isBlogHost(reqHost)) {
    const url = req.nextUrl.clone();
    const localeMatch = url.pathname.match(/^\/([a-z]{2})(?=\/|$)/);
    const locale = localeMatch ? localeMatch[1] : detectLocale(req);
    const rest = localeMatch ? url.pathname.slice(localeMatch[0].length) : url.pathname;
    // 작가 프로필 (velog 식) — blog.kurl.me/@{user}[/...] → /{locale}/p/{user}[/...]. `@` 접두사가
    // 작가명과 블로그 자체 경로(write·tags·posts 등)를 충돌 없이 가른다. 일반 blog rewrite 보다 먼저.
    const authorMatch = rest.match(/^\/@([^/]+)(\/.*)?$/);
    if (authorMatch) {
      url.pathname = `/${locale}/p/${decodeURIComponent(authorMatch[1])}${authorMatch[2] ?? ""}`;
      return NextResponse.rewrite(url);
    }
    if (!url.pathname.match(/^\/[a-z]{2}\/blog(\/|$)/)) {
      url.pathname = `/${locale}/blog${rest === "/" ? "" : rest}`;
      routeFeedVariant(req, url);
      return NextResponse.rewrite(url);
    }
  }

  // 4. dev / preview path-based blog — /blog-preview/* 또는 /{locale}/blog-preview/* → /{locale}/blog/*
  const previewMatch = req.nextUrl.pathname.match(
    /^(\/[a-z]{2})?\/blog-preview(\/.*)?$/,
  );
  if (previewMatch) {
    const url = req.nextUrl.clone();
    const locale = previewMatch[1] ?? `/${DEFAULT_LOCALE}`;
    const rest = previewMatch[2] ?? "";
    url.pathname = `${locale}/blog${rest}`;
    routeFeedVariant(req, url);
    return NextResponse.rewrite(url);
  }

  // Direct /{locale}/blog hits that didn't pass the host rewrites above (dev/preview serving the
  // feed on the apex) still need the static/browse split.
  {
    const url = req.nextUrl.clone();
    const before = url.pathname;
    routeFeedVariant(req, url);
    if (url.pathname !== before) return NextResponse.rewrite(url);
  }

  // 5. kurl.me / default — /{locale}/foo → /{locale}/links/foo rewrite
  // 단 이미 /{locale}/{links,blog,p,u} 으로 시작하면 그대로 (internal route 보호). 루트 locale 의
  // 메타데이터 라우트(opengraph-image / twitter-image — app/[locale]/ 직하)도 links 로 보내면 404 →
  // Discord/Kakao 등 공유 미리보기 이미지가 깨진다. 그대로 둬서 file-convention 라우트가 살게 한다.
  const localePathMatch = req.nextUrl.pathname.match(/^\/([a-z]{2})(\/.+)?$/);
  if (localePathMatch && localePathMatch[2]) {
    const sub = localePathMatch[2];
    if (!sub.match(/^\/(links|blog|p|u|opengraph-image|twitter-image)(\/|$)/)) {
      const url = req.nextUrl.clone();
      url.pathname = `/${localePathMatch[1]}/links${sub}`;
      return NextResponse.rewrite(url);
    }
    // Blog routes serve as-is. Falling through to intlMiddleware attached a NEXT_LOCALE
    // Set-Cookie to every response, and a response with Set-Cookie is uncacheable — it
    // single-handedly kept the prerendered blog pages (the ISR feed above all) off the edge
    // cache. Scoped to /blog only: its server pages all pass the locale explicitly, while p/u
    // pages still resolve their request locale through intlMiddleware (they're force-dynamic,
    // so the cookie costs them nothing).
    if (sub.match(/^\/blog(\/|$)/)) {
      return NextResponse.next();
    }
  }
  // /{locale} 만 (path 없음) → /{locale}/links
  if (localePathMatch && !localePathMatch[2]) {
    const url = req.nextUrl.clone();
    url.pathname = `/${localePathMatch[1]}/links`;
    return NextResponse.rewrite(url);
  }

  // 6. locale 없는 path — next-intl 의 default redirect (locale prefix 부착)
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|favicon.ico|.*\\..*|oauth2|login/oauth2|monitoring).*)",
    // Showcase 데모 핸들 (min.links / dohyun.coffee 등) 은 segment 에 점이 들어간다. 위 catch-all
    // 의 `.*\\..*` 가 static asset 을 거르려고 점 포함 경로를 전부 제외하는데, 그 바람에 이 핸들들도
    // middleware 를 건너뛰어 `/showcase/<handle>` → `/links/showcase/<handle>` rewrite 가 돌지
    // 않고 404 가 난다. 점 포함 showcase 경로만 명시적으로 다시 포함시킨다.
    "/:locale/showcase/:handle*",
  ],
};
