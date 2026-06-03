const BASE = process.env.NEXT_PUBLIC_KURL_HOST; // e.g. "kurl.me"

/**
 * Persist the dark/light choice in a cookie scoped to the PARENT domain (e.g. `.kurl.me`) so the theme
 * is shared across the apex feed (kurl.me) AND the author subdomains ({user}.kurl.me) — localStorage is
 * per-origin, so the blog (which spans both) otherwise showed a different theme on each surface.
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
  document.cookie = `theme=${value}; path=/; max-age=31536000; samesite=lax${domain}`;
}
