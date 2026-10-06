"use client";

import { useLocale } from "next-intl";
import { compactTime } from "./compact-time";

export function useCompactTime() {
  const locale = useLocale();
  return (iso: string) => compactTime(iso, locale);
}
