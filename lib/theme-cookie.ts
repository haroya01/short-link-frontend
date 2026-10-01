// Fallback to "kurl.me" when the env var is missing so the shared `.kurl.me` theme cookie still
// lands in prod; the `onPlatform` guard keeps it host-only off-platform (localhost / previews).
const BASE = process.env.NEXT_PUBLIC_KURL_HOST ?? "kurl.me"; // e.g. "kurl.me"
const BLOG_HOST = process.env.NEXT_PUBLIC_BLOG_HOST ?? `blog.${BASE}`; // e.g. "blog.kurl.me"

/**
 * 테마는 제품별로 따로 간다 — 블로그에서 다크를 써도 kurl(링크단축)은 기본 백을 지킨다는
 * 사용자 결정(2026-07-15). 블로그는 `theme`, kurl 은 전용 `kurl_theme`. 도메인은 둘 다 `.kurl.me` —
 * 분리는 쿠키 "이름"이 하고, 도메인 공유는 같은 제품의 표면 간 일관성이 한다(블로그 =
 * blog.kurl.me ↔ apex /p, kurl = apex ↔ 명함 {user}.kurl.me).
 *
 * 표면 판정: 블로그 호스트(blog.kurl.me)면 블로그, 그 밖의 호스트는 /{locale}/blog|p 경로만
 * 블로그이고 나머지가 kurl 이다. 명함 {user}.kurl.me 는 링크 제품이라 kurl — apex 의 같은 명함
 * (/{locale}/u/{user})과 같은 쿠키를 읽는다.
 *
 * Self-contained on purpose: the no-FOUC scripts inline this function's own source (see
 * themeCookieNameScript), so the body may use only its arguments — no imports, no module-level values.
 */
function isBlogSurfaceAt(hostname: string, pathname: string, blogHost: string): boolean {
  return hostname === blogHost || /^\/[a-z]{2}\/(blog|p)(\/|$)/.test(pathname);
}

export function isBlogSurface(): boolean {
  if (typeof location === "undefined") return false;
  return isBlogSurfaceAt(location.hostname, location.pathname, BLOG_HOST);
}

export function themeCookieName(): "theme" | "kurl_theme" {
  return isBlogSurface() ? "theme" : "kurl_theme";
}

/**
 * themeCookieName() 의 pre-paint 판본 — <head> 인라인 스크립트(app/[locale]/layout.tsx,
 * app/not-found.tsx)는 이 모듈을 import 할 수 없어 판정 함수의 소스를 그대로 싣는다. 쿠키 이름을
 * `n` 으로 선언하고, 뒤에 이어 붙는 문장이 `n` 을 읽는다.
 */
export const themeCookieNameScript =
  `var n=(${isBlogSurfaceAt.toString()})(location.hostname,location.pathname,${JSON.stringify(BLOG_HOST)})` +
  "?'theme':'kurl_theme';";

/**
 * Persist the dark/light choice in a cookie scoped to the PARENT domain (e.g. `.kurl.me`) so the theme
 * is shared across the surfaces of the SAME product — blog spans blog.kurl.me and the apex /p routes,
 * kurl spans the apex and the {user}.kurl.me card; localStorage is per-origin, so a product that spans
 * origins otherwise showed a different theme on each surface.
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
