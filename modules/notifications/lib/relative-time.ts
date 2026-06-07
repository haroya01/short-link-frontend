"use client";

import { useLocale } from "next-intl";
import { dateLocale } from "@/lib/date";

/**
 * "5분 전" / "5 minutes ago" / "5 分前" — localized via {@link Intl.RelativeTimeFormat}, so no per-unit
 * translation keys are needed. Falls back to an absolute date past a week, where "8일 전" stops being
 * more legible than the date.
 */
export function useRelativeTime() {
  const locale = useLocale();
  return (iso: string) => formatRelative(iso, locale);
}

function formatRelative(iso: string, locale: string): string {
  const tag = dateLocale(locale);
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 604_800) return rtf.format(Math.round(diffSec / 86_400), "day");
  return new Date(iso).toLocaleDateString(tag, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
