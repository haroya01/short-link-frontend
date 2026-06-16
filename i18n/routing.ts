import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // ko/en/ja core + vi(베트남)·hi(힌디) 확장 — 동남아·인도 권역 도달(hreflang·sitemap 자동 확장).
  locales: ["en", "ko", "ja", "vi", "hi"],
  // Japan-first + Korea product: when the visitor's language can't be matched, fall back to ko
  // (not en). The actual locale is detected per request (Accept-Language / NEXT_LOCALE) in middleware.
  defaultLocale: "ko",
  localePrefix: "always",
});
