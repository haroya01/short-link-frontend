"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type DemoClick = {
  id: number;
  countryCode: string;
  deviceClass: string;
  channel: string;
  at: number;
};

/**
 * Public {@code /demo} stand-in for {@link import("@/components/links/stats/live-click-feed").LiveClickFeed}.
 *
 * <p>Renders the same chrome (title, "라이브" pill, divided list) so visitors get the real
 * feeling of "stuff arrives in real time" without the page trying to authenticate against the
 * backend's SSE endpoint. A scripted ring buffer pops a new row every ~3.2s, capped at 6, so
 * the section always looks alive but never accumulates indefinitely on a long demo session.
 *
 * <p>Why a separate component instead of feeding fake data through the real one: the real feed
 * is gated on {@code readToken()} returning a value, and silently no-ops without it. That's
 * the correct behaviour on the dashboard (the user would see nothing if they signed out mid-
 * session) but would leave the /demo page with a permanently-empty section, which reads as
 * broken.
 */
export function LiveClickFeedDemo() {
  const t = useTranslations("stats.live");
  const locale = useLocale();
  const [items, setItems] = useState<DemoClick[]>(() => {
    const now = Date.now();
    return [
      { id: 1, countryCode: "KR", deviceClass: "iOS", channel: "instagram", at: now - 41_000 },
      { id: 2, countryCode: "KR", deviceClass: "Android", channel: "kakao", at: now - 97_000 },
      { id: 3, countryCode: "JP", deviceClass: "iOS", channel: "instagram", at: now - 184_000 },
    ];
  });

  useEffect(() => {
    const scripted: Omit<DemoClick, "id" | "at">[] = [
      { countryCode: "KR", deviceClass: "iOS", channel: "instagram" },
      { countryCode: "US", deviceClass: "macOS", channel: "x" },
      { countryCode: "KR", deviceClass: "Android", channel: "kakao" },
      { countryCode: "JP", deviceClass: "iOS", channel: "instagram" },
      { countryCode: "KR", deviceClass: "iOS", channel: "qr" },
      { countryCode: "DE", deviceClass: "Windows", channel: "blog" },
      { countryCode: "KR", deviceClass: "Android", channel: "kakao" },
    ];
    let i = 0;
    let nextId = 1000;
    const handle = window.setInterval(() => {
      // 탭이 숨겨져 있으면 보이지도 않는 리렌더로 CPU만 쓰므로 건너뛴다.
      if (document.hidden) return;
      const entry = scripted[i % scripted.length];
      i += 1;
      setItems((prev) => [{ id: nextId++, ...entry, at: Date.now() }, ...prev].slice(0, 6));
    }, 3200);
    return () => window.clearInterval(handle);
  }, []);

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
            <span className="tabular-nums text-slate-500 dark:text-slate-400" suppressHydrationWarning>
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
    return new Date(at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}
