import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

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
const LOCALE_RE = /^([a-z]{2})(\/.*)?$/;

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

  // /{locale}/showcase* → blog.kurl.me/{locale}/showcase*
  const showcaseMatch = path.match(/^\/([a-z]{2})\/showcase(\/.*)?$/);
  if (showcaseMatch) {
    const sub = showcaseMatch[2] || "";
    return NextResponse.redirect(
      `https://${BLOG_HOST_DEFAULT}/${showcaseMatch[1]}/showcase${sub}${search}`,
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

  // 2. 작가 페이지 — {username}.kurl.me/{anything} → /{defaultLocale}/p/{username}/{anything}
  const authorSub = extractAuthorSubdomain(originalHost);
  if (authorSub) {
    const url = req.nextUrl.clone();
    const path = url.pathname;
    url.pathname =
      path === "/"
        ? `/${DEFAULT_LOCALE}/p/${authorSub}`
        : `/${DEFAULT_LOCALE}/p/${authorSub}${path}`;
    return NextResponse.rewrite(url);
  }

  // 3. blog.kurl.me — /{locale}/foo → /{locale}/blog/foo rewrite
  if (isBlogHost(originalHost) || isBlogHost(reqHost)) {
    const url = req.nextUrl.clone();
    const m = url.pathname.match(/^\/(?:([a-z]{2})(\/.*)?)?$/);
    const locale = m?.[1] ?? DEFAULT_LOCALE;
    const rest = m?.[2] ?? "/";
    const tail = rest === "/" ? "" : rest;
    if (!url.pathname.match(/^\/[a-z]{2}\/blog(\/|$)/)) {
      url.pathname = `/${locale}/blog${tail}`;
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
    return NextResponse.rewrite(url);
  }

  // 5. kurl.me / default — /{locale}/foo → /{locale}/links/foo rewrite
  // 단 이미 /{locale}/{links,blog,p,u} 으로 시작하면 그대로 (internal route 보호).
  const localePathMatch = req.nextUrl.pathname.match(/^\/([a-z]{2})(\/.+)?$/);
  if (localePathMatch && localePathMatch[2]) {
    const sub = localePathMatch[2];
    if (!sub.match(/^\/(links|blog|p|u)(\/|$)/)) {
      const url = req.nextUrl.clone();
      url.pathname = `/${localePathMatch[1]}/links${sub}`;
      return NextResponse.rewrite(url);
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
  ],
};
