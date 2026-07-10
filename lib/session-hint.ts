// A non-secret hint cookie that records "this browser has an active kurl session". It gates the
// refresh-cookie recovery POST in bootstrapSession so a pure anonymous visitor never pays a
// guaranteed-401 /auth/refresh on every public page load. Scoped to the PARENT domain (.kurl.me) —
// like the HttpOnly refresh cookie it shadows — so the hint is visible across the apex and author
// subdomains, keeping cross-subdomain session recovery working. Host-only off-platform (localhost,
// Vercel previews), where a parent-domain cookie would be wrong or rejected (public-suffix).
const BASE = process.env.NEXT_PUBLIC_KURL_HOST ?? "kurl.me"; // e.g. "kurl.me"

const SESSION_HINT_COOKIE = "kurl_has_session";

function platformDomain(): string {
  const host = location.hostname;
  const onPlatform = !!BASE && (host === BASE || host.endsWith(`.${BASE}`));
  return onPlatform ? `; domain=.${BASE}` : "";
}

/**
 * Set on every authenticated bootstrap and token grant. Long-lived on purpose: it must outlive the
 * HttpOnly refresh cookie, or a returning session would be read as anonymous and skip recovery. A
 * stale-positive only costs one 401 (today's default behaviour); a stale-negative silently logs the
 * user out — so we bias long.
 */
export function writeSessionHint() {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_HINT_COOKIE}=1; path=/; max-age=31536000; samesite=lax${platformDomain()}`;
}

/** Cleared on logout / dead-session. Mirror the domain so the delete actually lands. */
export function clearSessionHint() {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_HINT_COOKIE}=; path=/; max-age=0; samesite=lax${platformDomain()}`;
}

export function hasSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return new RegExp(`(?:^|; )${SESSION_HINT_COOKIE}=1`).test(document.cookie);
}
