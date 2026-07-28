/**
 * 통계 원값 → 사람 말. 저장된 값(카카오톡 UA 토큰, Sec-Fetch-Site 스펙 값)을 그대로 화면에
 * 노출하지 않기 위한 얇은 사전이다. 카탈로그에 없는 값은 번역을 시도하지 않고 원값 그대로
 * 내보낸다 — 백엔드가 앱을 하나 더 분류하기 시작해도 화면이 빈칸이 되지 않게(요일 폴백과 같은 방식).
 */

/** 백엔드 {@code clientApp.*} 메시지 키와 같은 목록. */
export const CLIENT_APPS: ReadonlySet<string> = new Set([
  "kakaotalk",
  "instagram",
  "line",
  "facebook",
  "naver",
  "daum",
  "tiktok",
  "twitter",
]);

/**
 * Sec-Fetch-Site 스펙 4값 → 메시지 키. 하이픈이 든 원값을 그대로 키로 쓰지 않고 camelCase 로
 * 옮긴다(카탈로그 키에 하이픈이 섞이는 걸 막는 쪽).
 */
export const FETCH_SITE_KEYS: Readonly<Record<string, string>> = {
  none: "direct",
  "cross-site": "crossSite",
  "same-site": "sameSite",
  "same-origin": "sameOrigin",
};
