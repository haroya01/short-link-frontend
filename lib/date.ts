/**
 * App-locale → BCP-47 date locale, with a ko fallback. Was copy-pasted as a local `DATE_LOCALE` const
 * in every blog surface that formats dates; centralized here so the locale set lives in one place.
 */
export const DATE_LOCALE: Record<string, string> = {
  ko: "ko-KR",
  ja: "ja-JP",
  en: "en-US",
  vi: "vi-VN",
  hi: "hi-IN",
};

/** Resolve an app locale to its BCP-47 tag for Intl / toLocaleDateString (ko-KR fallback). */
export function dateLocale(locale: string): string {
  return DATE_LOCALE[locale] ?? "ko-KR";
}
