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
 * it) don't get re-asked; {@link writeConsent} migrates them on the next visit.
 *
 * <p>동의는 세 상태다 — 아직 안 고름(null) · accepted · rejected. 예전엔 accepted 하나뿐이라
 * "거부" 를 표현할 방법 자체가 없었고, 그래서 배너에도 확인 버튼 하나뿐이었다. 거부를 저장할 수
 * 있어야 거부한 방문자에게 매번 다시 묻지 않는다.
 */
export const CONSENT_COOKIE = "cookie-consent";
export const LEGACY_CONSENT_STORAGE_KEY = "kurl:cookie-consent:v1";

/** 동의 상태가 바뀌면 이 이벤트가 뜬다 — 분석 SDK 가 새로고침 없이 즉시 켜지도록. */
export const CONSENT_CHANGE_EVENT = "kurl:consent-change";

export type ConsentValue = "accepted" | "rejected";

export function readConsent(): ConsentValue | null {
  if (typeof document === "undefined") return null;
  const m = new RegExp(`(?:^|; )${CONSENT_COOKIE}=(accepted|rejected)`).exec(document.cookie);
  if (m) return m[1] as ConsentValue;
  // 레거시 키에는 accepted 만 존재했다.
  return readStorageString(LEGACY_CONSENT_STORAGE_KEY) === "accepted" ? "accepted" : null;
}

/**
 * 분석을 켜도 되는가. 이 함수가 수집의 유일한 관문이다 — 예전엔 동의 상태를 읽는 코드가 배너
 * 자기 자신뿐이어서, 버튼을 눌러도 수집에는 아무 영향이 없었다(배너만 닫혔다).
 */
export function hasAcceptedConsent(): boolean {
  return readConsent() === "accepted";
}

/** 배너를 더 보여줄지 — 동의든 거부든 한 번 고른 사람에겐 다시 묻지 않는다. */
export function hasSettledConsent(): boolean {
  return readConsent() !== null;
}

/** Same parent-domain scoping as writeThemeCookie — one consent across kurl.me + {user}.kurl.me. */
export function writeConsent(value: ConsentValue) {
  if (typeof document === "undefined") return;
  const host = location.hostname;
  const onPlatform = !!BASE && (host === BASE || host.endsWith(`.${BASE}`));
  const domain = onPlatform ? `; domain=.${BASE}` : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax${domain}`;
  if (value === "rejected") purgeAnalyticsStorage();
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: value }));
}

/**
 * 거부를 고르면 이미 심어진 분석 저장소를 걷어낸다. 철회했는데 예전 식별자가 단말에 남아 있으면
 * 철회가 반쪽이다. PostHog 는 키 접두사가 `ph_` 라 그것만 정확히 지운다.
 */
export function purgeAnalyticsStorage() {
  if (typeof window === "undefined") return;
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("ph_")) localStorage.removeItem(key);
    }
  } catch {
    // 사파리 프라이빗 등 localStorage 접근 자체가 막힌 환경 — 지울 것도 없다.
  }
}
