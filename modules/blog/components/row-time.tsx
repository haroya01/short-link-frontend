"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { DATE_LOCALE } from "@/lib/date";
import { compactTime } from "@/modules/notes/lib/compact-time";

const subscribe = () => () => {};

export function absoluteRowDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
}

export function RowTime({ iso, locale, className }: { iso: string; locale: string; className?: string }) {
  // The feed HTML can come from the ISR cache, so a relative time must wait for the reader's clock.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const t = useTranslations("common");
  return (
    <time dateTime={iso} className={className}>
      {hydrated ? compactTime(iso, locale, t("justNow")) : absoluteRowDate(iso, locale)}
    </time>
  );
}
