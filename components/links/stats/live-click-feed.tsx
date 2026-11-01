"use client";

import { useLocale, useTranslations } from "next-intl";
import { useClickStream } from "@/hooks/use-click-stream";
import { cn } from "@/lib/utils";

export function LiveClickFeed({ shortCode, onTick }: { shortCode: string; onTick?: () => void }) {
  const t = useTranslations("stats");
  const locale = useLocale();
  const { items, count } = useClickStream(shortCode, { onTick });

  return (
    <div
      aria-live="polite"
      className={cn(
        "grid transition-[grid-template-rows] duration-500 ease-[var(--ease)] motion-reduce:transition-none",
        count > 0 ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        {count > 0 && (
          <section data-testid="live-feed" className="pb-10">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("live.now")}</h2>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item) => (
                <li key={item.id} className="live-arrive flex min-w-0 items-baseline gap-3 py-2.5 text-[13px]">
                  <time
                    dateTime={item.occurredAt}
                    className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400"
                    suppressHydrationWarning
                  >
                    {formatTime(item.occurredAt, locale)}
                  </time>
                  <span className="min-w-0 truncate text-slate-900 dark:text-slate-100">
                    {[item.countryCode, item.deviceClass, item.channel].filter(Boolean).join(" · ")}
                  </span>
                  {item.bot && <span className="ml-auto shrink-0 text-slate-500 dark:text-slate-400">{t("live.bot")}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function formatTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
