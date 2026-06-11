import { readStorageString } from "@/lib/storage-json";

// Mirror of theme-cookie.ts: parent-domain cookie on platform hosts, host-only elsewhere.
const BASE = process.env.NEXT_PUBLIC_KURL_HOST ?? "kurl.me";

/**
 * Cookie consent moved from localStorage to a cookie so the SERVER can ship the banner in the
 * initial HTML. The localStorage version only mounted after hydration, which (a) showed new
 * visitors the banner a hydration-late beat after the page, and (b) made the banner the page's
 * LCP element at TTI on landing surfaces where the hero text never registers a paint-time LCP
 * record (see PR #710) — Lighthouse read the home LCP as ≈ hydration time.
 *
 * The legacy localStorage key keeps being READ so existing visitors (and e2e specs that pre-seed
 * it) don't get re-asked; {@link writeConsentCookie} migrates them on the next visit.
 */
export const CONSENT_COOKIE = "cookie-consent";
export const LEGACY_CONSENT_STORAGE_KEY = "kurl:cookie-consent:v1";

export function hasAcceptedConsent(): boolean {
  if (typeof document === "undefined") return false;
  if (new RegExp(`(?:^|; )${CONSENT_COOKIE}=accepted`).test(document.cookie)) return true;
  return readStorageString(LEGACY_CONSENT_STORAGE_KEY) === "accepted";
}

/** Same parent-domain scoping as writeThemeCookie — one consent across kurl.me + {user}.kurl.me. */
export function writeConsentCookie() {
  if (typeof document === "undefined") return;
  const host = location.hostname;
  const onPlatform = !!BASE && (host === BASE || host.endsWith(`.${BASE}`));
  const domain = onPlatform ? `; domain=.${BASE}` : "";
  document.cookie = `${CONSENT_COOKIE}=accepted; path=/; max-age=31536000; samesite=lax${domain}`;
}
