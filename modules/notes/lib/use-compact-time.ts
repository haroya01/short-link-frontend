"use client";

import { useLocale, useTranslations } from "next-intl";
import { compactTime } from "./compact-time";

export function useCompactTime() {
  const locale = useLocale();
  const t = useTranslations("common");
  const justNow = t("justNow");
  return (iso: string) => compactTime(iso, locale, justNow);
}
