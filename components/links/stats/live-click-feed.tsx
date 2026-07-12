"use client";

import { useTranslations } from "next-intl";
import { useClickStream } from "@/hooks/use-click-stream";

/**
 * Stats-page live feed. Auth runs through the JWT path inside {@link useClickStream} (no claim
 * token here — by the time you've reached the stats page you're authenticated).
 */
export function LiveClickFeed({ shortCode, onTick }: { shortCode: string; onTick?: () => void }) {
  const t = useTranslations("stats.live");
  const { items, connected } = useClickStream(shortCode, { onTick });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold text-accent-700 dark:text-accent-400">
          {t("title")}
        </h3>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span
            className={
              "inline-block h-2 w-2 rounded-full " +
              (connected ? "animate-pulse bg-accent-600" : "bg-slate-300 dark:bg-slate-700")
            }
            aria-hidden
          />
          <span className={connected ? "font-medium text-accent-700 dark:text-accent-400" : "text-slate-500 dark:text-slate-400"}>
            {connected ? t("connected") : t("connecting")}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 px-4 py-10 text-center text-[12px] text-slate-500 dark:text-slate-400">
          {t("waiting")}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 text-[12px]">
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400" suppressHydrationWarning>
                {formatTime(item.occurredAt)}
              </span>
              {item.countryCode && (
                <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                  {item.countryCode}
                </span>
              )}
              {item.deviceClass && (
                <span className="text-slate-600 dark:text-slate-300">{item.deviceClass}</span>
              )}
              {item.channel && (
                <span className="truncate text-slate-500 dark:text-slate-400" title={item.channel}>
                  · {item.channel}
                </span>
              )}
              {item.bot && (
                <span className="ml-auto rounded-md bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  bot
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString();
  } catch {
    return iso;
  }
}
