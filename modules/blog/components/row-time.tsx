"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { compactTime, rowDate } from "@/modules/notes/lib/compact-time";

const subscribe = () => () => {};

export function RowTime({ iso, locale, className }: { iso: string; locale: string; className?: string }) {
  // The feed HTML can come from the ISR cache, so a relative time must wait for the reader's clock.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const t = useTranslations("common");
  return (
    <time dateTime={iso} className={className}>
      {hydrated ? compactTime(iso, locale, t("justNow")) : rowDate(iso, locale)}
    </time>
  );
}
