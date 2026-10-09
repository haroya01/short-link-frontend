"use client";

import { useSyncExternalStore } from "react";
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
  // The server copy can be served from the ISR cache long after it was rendered, so it carries the
  // absolute date and the relative one replaces it only once the reader's own clock is available.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return (
    <time dateTime={iso} className={className}>
      {hydrated ? compactTime(iso, locale) : absoluteRowDate(iso, locale)}
    </time>
  );
}
