"use client";

import { useLocale, useTranslations } from "next-intl";

type DemoClick = {
  id: number;
  countryCode: string;
  deviceClass: string;
  channel: string;
  at: number;
};

const STILL_ROWS: DemoClick[] = [
  { id: 1, countryCode: "KR", deviceClass: "iOS", channel: "instagram", at: Date.UTC(2026, 0, 1, 14, 32, 8) },
  { id: 2, countryCode: "KR", deviceClass: "Android", channel: "kakao", at: Date.UTC(2026, 0, 1, 14, 31, 40) },
  { id: 3, countryCode: "JP", deviceClass: "iOS", channel: "x", at: Date.UTC(2026, 0, 1, 14, 29, 55) },
  { id: 4, countryCode: "KR", deviceClass: "macOS", channel: "blog", at: Date.UTC(2026, 0, 1, 14, 27, 12) },
  { id: 5, countryCode: "US", deviceClass: "Windows", channel: "qr", at: Date.UTC(2026, 0, 1, 14, 26, 3) },
];

/**
 * Example stand-in for {@link import("@/components/links/stats/live-click-feed").LiveClickFeed} on
 * the public /demo and the home page: the same chrome with fixed example rows at fixed times. It never
 * ticks — a feed that loops a script reads as fake, and the real feed needs a signed-in session.
 */
export function LiveClickFeedDemo() {
  const t = useTranslations("stats.live");
  const locale = useLocale();
  const items = STILL_ROWS;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h3>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {t("example")}
        </span>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-3 py-2 text-xs">
            <span className="tabular-nums text-slate-500 dark:text-slate-400">
              {formatTime(item.at, locale)}
            </span>
            <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 tabular-nums text-[10px] text-slate-700 dark:text-slate-300">
              {item.countryCode}
            </span>
            <span className="text-slate-600 dark:text-slate-300">{item.deviceClass}</span>
            <span className="truncate text-slate-500 dark:text-slate-400">· {item.channel}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatTime(at: number, locale: string): string {
  try {
    return new Date(at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" });
  } catch {
    return "";
  }
}
