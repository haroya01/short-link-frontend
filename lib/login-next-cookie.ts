// Fallback to "kurl.me" when the env var is missing (it's unset in some deploy envs) so the
// parent-domain (`.kurl.me`) cookie still lands in prod. The `onPlatform` guard below keeps it
// host-only off-platform (localhost / *.vercel.app), so the fallback can't mis-scope a cookie there.
const BASE = process.env.NEXT_PUBLIC_KURL_HOST ?? "kurl.me"; // e.g. "kurl.me"

const LOGIN_NEXT_COOKIE = "kurl_login_next";

function platformDomain(): string {
  const host = location.hostname;
  const onPlatform = !!BASE && (host === BASE || host.endsWith(`.${BASE}`));
  return onPlatform ? `; domain=.${BASE}` : "";
}

/**
 * Where to return after the OAuth round-trip (the FULL url login started from). Stored in a cookie
 * scoped to the PARENT domain (e.g. `.kurl.me`) — NOT sessionStorage, which is per-ORIGIN: login often
 * starts on blog.kurl.me (or {author}.kurl.me) but the OAuth callback lands on the apex, so a per-origin
 * stash is gone by the time the callback reads it and every blog login fell back to /dashboard.
 *
 * We keep the absolute href (incl. origin), not just the path, because replaying a bare path on the
 * apex callback origin would send a blog feed / workspace return ("/") to the links product instead of
 * back to blog.kurl.me. {@link readSafeLoginNext} validates the origin before it's ever used.
 *
 * Falls back to a host-scoped cookie off-platform (localhost, Vercel previews), where a parent-domain
 * cookie would be wrong or rejected (public-suffix). 10-minute lifetime — long enough for the OAuth
 * hop, short enough that a stale value can't hijack a later, unrelated login. `samesite=lax` so it
 * rides the top-level GET navigation back from Google.
 */
export function writeLoginNextCookie(href: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${LOGIN_NEXT_COOKIE}=${encodeURIComponent(href)}; path=/; max-age=600; samesite=lax${platformDomain()}`;
}

/**
 * Read the stashed return url and return it only if it points back to this platform — same origin, or
 * an on-platform `.kurl.me` host (blog / author subdomain / apex). Anything else (off-origin, bad
 * scheme, junk) returns null so the caller falls back to /dashboard and we can't be turned into an
 * open redirect. Clears the cookie as it reads (single-use).
 */
export function readSafeLoginNext(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOGIN_NEXT_COOKIE}=([^;]*)`));
  clearLoginNextCookie();
  if (!m) return null;
  let raw: string;
  try {
    raw = decodeURIComponent(m[1]);
  } catch {
    return null;
  }
  let url: URL;
  try {
    url = new URL(raw, location.origin);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const sameOrigin = url.origin === location.origin;
  const onPlatform =
    !!BASE && (url.hostname === BASE || url.hostname.endsWith(`.${BASE}`));
  return sameOrigin || onPlatform ? url.toString() : null;
}

/** Clear the stash. Mirror the domain so the delete actually lands. */
export function clearLoginNextCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${LOGIN_NEXT_COOKIE}=; path=/; max-age=0; samesite=lax${platformDomain()}`;
}
