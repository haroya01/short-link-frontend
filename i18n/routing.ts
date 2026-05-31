import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ko", "ja"],
  // Japan-first + Korea product: when the visitor's language can't be matched, fall back to ko
  // (not en). The actual locale is detected per request (Accept-Language / NEXT_LOCALE) in middleware.
  defaultLocale: "ko",
  localePrefix: "always",
});
