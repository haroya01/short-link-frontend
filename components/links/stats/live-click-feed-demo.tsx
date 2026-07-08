"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type DemoClick = {
  id: number;
  countryCode: string;
  deviceClass: string;
  channel: string;
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
  const [items, setItems] = useState<DemoClick[]>([
    { id: 1, countryCode: "KR", deviceClass: "iOS", channel: "instagram" },
    { id: 2, countryCode: "KR", deviceClass: "Android", channel: "kakao" },
    { id: 3, countryCode: "JP", deviceClass: "iOS", channel: "instagram" },
  ]);

  useEffect(() => {
    const scripted: Omit<DemoClick, "id">[] = [
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
      setItems((prev) => [{ id: nextId++, ...entry }, ...prev].slice(0, 6));
    }, 3200);
    return () => window.clearInterval(handle);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h3>
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent-600"
            aria-hidden
          />
          <span className="text-accent-700 dark:text-accent-400">{t("connected")}</span>
        </div>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-3 py-2 text-xs">
            <span className="font-mono text-slate-500 dark:text-slate-400" suppressHydrationWarning>
              {formatTime()}
            </span>
            <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:text-slate-300">
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

function formatTime(): string {
  try {
    return new Date().toLocaleTimeString();
  } catch {
    return "";
  }
}
