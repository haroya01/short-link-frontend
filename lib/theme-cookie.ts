// Fallback to "kurl.me" when the env var is missing so the shared `.kurl.me` theme cookie still
// lands in prod; the `onPlatform` guard keeps it host-only off-platform (localhost / previews).
const BASE = process.env.NEXT_PUBLIC_KURL_HOST ?? "kurl.me"; // e.g. "kurl.me"

/**
 * 테마는 제품별로 따로 간다 — 블로그에서 다크를 써도 kurl(링크단축)은 기본 백을 지킨다는
 * 사용자 결정(2026-07-15). 블로그는 기존 `theme` 쿠키(피드 blog.kurl.me ↔ 작가 {author}.kurl.me
 * 가 같은 글 경험이라 반드시 공유), kurl 은 전용 `kurl_theme`. 도메인은 둘 다 `.kurl.me` —
 * 분리는 쿠키 "이름"이 하고, 도메인 공유는 같은 제품의 표면 간 일관성이 한다.
 *
 * 표면 판정: 플랫폼에선 서브도메인(blog.·{author}.)이면 블로그, apex 는 /{locale}/blog|p 경로만
 * 블로그(글쓰기 허브 등)이고 나머지가 kurl. 오프플랫폼(localhost/프리뷰 단일 오리진)은 경로만
 * 본다. ※ app/[locale]/layout.tsx 의 no-FOUC themeInitScript 가 같은 판정을 인라인으로 복제한다
 * — 바꾸면 반드시 같이 바꿀 것(스크립트는 pre-paint 라 이 모듈을 import 할 수 없다).
 */
export function isBlogSurface(): boolean {
  if (typeof location === "undefined") return false;
  const host = location.hostname;
  const onPlatform = !!BASE && (host === BASE || host.endsWith(`.${BASE}`));
  const blogPath = /^\/[a-z]{2}\/(blog|p)(\/|$)/.test(location.pathname);
  return (onPlatform && host !== BASE) || blogPath;
}

export function themeCookieName(): "theme" | "kurl_theme" {
  return isBlogSurface() ? "theme" : "kurl_theme";
}

/**
 * Persist the dark/light choice in a cookie scoped to the PARENT domain (e.g. `.kurl.me`) so the theme
 * is shared across the surfaces of the SAME product — for blog that's the apex feed routes AND the
 * author subdomains ({user}.kurl.me); localStorage is per-origin, so the blog (which spans origins)
 * otherwise showed a different theme on each surface.
 *
 * Falls back to a host-scoped cookie off-platform (localhost, Vercel previews), where a parent-domain
 * cookie would be wrong or rejected (public-suffix). The no-FOUC script in the root layout reads it.
 */
export function writeThemeCookie(value: "dark" | "light") {
  if (typeof document === "undefined") return;
  const host = location.hostname;
  const onPlatform = !!BASE && (host === BASE || host.endsWith(`.${BASE}`));
  const domain = onPlatform ? `; domain=.${BASE}` : "";
  // 1 year, lax so it rides top-level navigations between apex ↔ subdomain.
  document.cookie = `${themeCookieName()}=${value}; path=/; max-age=31536000; samesite=lax${domain}`;
}
