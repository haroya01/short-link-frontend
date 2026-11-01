"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { useTranslations } from "next-intl";
import { cn, formatNumber } from "@/lib/utils";

export type BarPoint = { key: string; count: number; label: string };

export function BarPlot({
  points,
  title,
  ticks,
  testId,
  compact = false,
}: {
  points: BarPoint[];
  title: string;
  ticks: number[];
  testId: string;
  compact?: boolean;
}) {
  const t = useTranslations("stats");
  const [pointed, setPointed] = useState<number | null>(null);
  const [intro, setIntro] = useState(true);

  const max = points.reduce((best, p) => Math.max(best, p.count), 0);
  const peak = points.findIndex((p) => p.count === max);
  const active = pointed ?? (max > 0 ? peak : null);
  const last = points.length - 1;
  const anchor = (i: number) => ((i + 0.5) / points.length) * 100;

  function indexAt(event: PointerEvent<HTMLElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    return Math.min(last, Math.max(0, Math.floor(ratio * points.length)));
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
    max > 0 ? `${title}. ${t("chart.summary", { label: points[peak].label, count: formatNumber(max) })}` : title;

  return (
    <figure className="w-full" data-testid={testId}>
      <div
        role="img"
        tabIndex={0}
        aria-label={summary}
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
          {points.map((p, i) => (
            <span key={p.key} data-count={p.count} className="flex h-full min-w-0 flex-1 items-end justify-center">
              {p.count > 0 && (
                <span
                  className={cn(
                    "block w-3/5 max-w-4 transition-colors duration-150 ease-[var(--ease)]",
                    active === i ? "bg-accent-600" : "bg-slate-300 dark:bg-slate-700",
                    intro && "bar-grow-y",
                  )}
                  style={{ height: `max(2px, ${(p.count / max) * 100}%)`, animationDelay: intro ? `${i * 14}ms` : undefined }}
                  onAnimationEnd={i === last ? () => setIntro(false) : undefined}
                />
              )}
            </span>
          ))}
          {active !== null && (
            <span
              data-testid={`${testId}-label`}
              className="pointer-events-none absolute whitespace-nowrap text-[12px] leading-none"
              style={{
                left: `${anchor(active)}%`,
                transform: `translateX(-${anchor(active)}%)`,
                bottom: `calc(${max > 0 ? (points[active].count / max) * 100 : 0}% + 8px)`,
              }}
            >
              <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {formatNumber(points[active].count)}
              </span>
              <span className="ml-1.5 text-slate-500 dark:text-slate-400">{points[active].label}</span>
            </span>
          )}
        </div>
      </div>
      <div aria-hidden className="relative mt-2 h-4 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
        {[...new Set(ticks)].filter((i) => i <= last).map((i) => (
          <span
            key={i}
            className="absolute top-0 whitespace-nowrap"
            style={
              i === 0 ? { left: 0 }
              : i === last ? { right: 0 }
              : { left: `${anchor(i)}%`, transform: "translateX(-50%)" }
            }
          >
            {points[i]?.label}
          </span>
        ))}
      </div>
      <div className="sr-only">
        <table>
          <tbody>
            {points.map((p) => (
              <tr key={p.key}>
                <th scope="row">{p.label}</th>
                <td>{t("clickCount", { count: formatNumber(p.count) })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
