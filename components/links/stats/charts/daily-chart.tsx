"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { DailyClick } from "@/types";
import { cn, formatNumber } from "@/lib/utils";

type Props = {
  data: DailyClick[];
  compact?: boolean;
};

function dayLabel(date: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const [, year, month, day] = match.map(Number);
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(
    Date.UTC(year, month - 1, day),
  );
}

export function DailyChart({ data, compact = false }: Props) {
  const t = useTranslations("stats");
  const locale = useLocale();
  const [pointed, setPointed] = useState<number | null>(null);
  const [intro, setIntro] = useState(true);
  if (data.length === 0) {
    return <p className="py-6 text-[13px] text-slate-500 dark:text-slate-400">{t("noClicks")}</p>;
  }

  const max = data.reduce((best, d) => Math.max(best, d.count), 0);
  const peak = data.findIndex((d) => d.count === max);
  const active = pointed ?? (max > 0 ? peak : null);
  const last = data.length - 1;
  const anchor = active === null ? 0 : ((active + 0.5) / data.length) * 100;

  function indexAt(event: PointerEvent<HTMLElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    return Math.min(last, Math.max(0, Math.floor(ratio * data.length)));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const from = active ?? last;
    const next =
      event.key === "ArrowLeft" ? from - 1
      : event.key === "ArrowRight" ? from + 1
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    setPointed(Math.min(last, Math.max(0, next)));
  }

  const summary =
    max > 0
      ? t("chart.summary", { date: dayLabel(data[peak].date, locale), count: formatNumber(max) })
      : t("noClicks");

  return (
    <figure className="w-full" data-testid="daily-chart">
      <div
        role="img"
        tabIndex={0}
        aria-label={`${t("section.daily.title")}. ${summary}`}
        onKeyDown={onKeyDown}
        onBlur={() => setPointed(null)}
        className={cn("focus-ring relative touch-pan-y rounded-lg pt-7", compact ? "h-40" : "h-72")}
        onPointerDown={(event) => setPointed(indexAt(event))}
        onPointerMove={(event) => setPointed(indexAt(event))}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setPointed(null);
        }}
      >
        <div className="relative flex h-full items-end gap-0.5 border-b border-slate-200 dark:border-slate-800">
          {data.map((d, i) => (
            <span key={d.date} data-count={d.count} className="flex h-full min-w-0 flex-1 items-end justify-center">
              {d.count > 0 && (
                <span
                  className={cn(
                    "block w-3/5 max-w-4 transition-colors duration-150 ease-[var(--ease)]",
                    pointed === i ? "bg-accent-700 dark:bg-accent-500" : "bg-accent-600",
                    intro && "bar-grow-y",
                  )}
                  style={{ height: `max(2px, ${(d.count / max) * 100}%)`, animationDelay: intro ? `${i * 14}ms` : undefined }}
                  onAnimationEnd={i === last ? () => setIntro(false) : undefined}
                />
              )}
            </span>
          ))}
          {active !== null && (
            <span
              data-testid="daily-chart-label"
              className="pointer-events-none absolute whitespace-nowrap text-[12px] leading-none"
              style={{
                left: `${anchor}%`,
                transform: `translateX(-${anchor}%)`,
                bottom: `calc(${max > 0 ? (data[active].count / max) * 100 : 0}% + 8px)`,
              }}
            >
              <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {formatNumber(data[active].count)}
              </span>
              <span className="ml-1.5 text-slate-500 dark:text-slate-400">{dayLabel(data[active].date, locale)}</span>
            </span>
          )}
        </div>
      </div>
      <div aria-hidden className="mt-2 flex justify-between text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
        <span>{dayLabel(data[0].date, locale)}</span>
        {last > 0 && <span>{dayLabel(data[last].date, locale)}</span>}
      </div>
      <div className="sr-only">
        <table>
          <tbody>
            {data.map((d) => (
              <tr key={d.date}>
                <th scope="row">{dayLabel(d.date, locale)}</th>
                <td>{t("clickCount", { count: formatNumber(d.count) })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
