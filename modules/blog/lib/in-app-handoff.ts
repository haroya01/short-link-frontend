const RULES: readonly (readonly [string, string])[] = [
  ["kakaotalk", "kakaotalk"],
  ["instagram", "instagram"],
  ["line/", "line"],
  ["fbav", "facebook"],
  ["fb_iab", "facebook"],
  ["naver(inapp", "naver"],
  ["daumapps", "daum"],
  ["musical_ly", "tiktok"],
  ["tiktok", "tiktok"],
  ["twitter", "twitter"],
];

const LINE_EXTERNAL_PARAM = "openExternalBrowser=1";
const KAKAOTALK_EXTERNAL = "kakaotalk://web/openExternal?url=";

export function inAppBrowser(userAgent: string | null | undefined): string | null {
  if (!userAgent || !userAgent.trim()) return null;
  const lower = userAgent.toLowerCase();
  for (const [token, app] of RULES) {
    if (lower.includes(token)) return app;
  }
  return null;
}

export function withParam(url: string, param: string): string {
  const hash = url.indexOf("#");
  const base = hash < 0 ? url : url.slice(0, hash);
  const fragment = hash < 0 ? "" : url.slice(hash);
  const separator = !base.includes("?") ? "?" : base.endsWith("?") || base.endsWith("&") ? "" : "&";
  return base + separator + param + fragment;
}

export function externalBrowserUrl(userAgent: string | null | undefined, url: string): string | null {
  const app = inAppBrowser(userAgent);
  if (app === "kakaotalk") return KAKAOTALK_EXTERNAL + encodeURIComponent(url);
  if (app === "line") return withParam(url, LINE_EXTERNAL_PARAM);
  return null;
}
