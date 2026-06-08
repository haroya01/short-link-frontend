"use client";

import { Fragment, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { HeatmapCell } from "@/types";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const MOBILE_BUCKET_HOURS = 4;
const MOBILE_BUCKETS = 24 / MOBILE_BUCKET_HOURS;
const MOBILE_BUCKET_STARTS = Array.from(
  { length: MOBILE_BUCKETS },
  (_, i) => i * MOBILE_BUCKET_HOURS,
);

type Hover = { day: string; hour: number; count: number; span: number };
type Selected = Hover;

export function Heatmap({ data }: { data: HeatmapCell[] }) {
  const t = useTranslations("stats.heatmap");
  const tDay = useTranslations("stats.weekday");
  const tShared = useTranslations("stats");
  const [hover, setHover] = useState<Hover | null>(null);
  // Click → persistent selection (until user clicks the same cell again or close button).
  // hover is independent: hover updates on mouse move / focus, selection updates on click only.
  const [selected, setSelected] = useState<Selected | null>(null);

  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">{tShared("noData")}</p>;
  }

  const grid: Record<string, Record<number, number>> = {};
  let max = 0;
  let total = 0;
  for (const d of DAYS) grid[d] = {};
  for (const cell of data) {
    if (!grid[cell.dayOfWeek]) grid[cell.dayOfWeek] = {};
    grid[cell.dayOfWeek][cell.hour] = cell.count;
    if (cell.count > max) max = cell.count;
    total += cell.count;
  }

  const mobileGrid: Record<string, number[]> = {};
  let mobileMax = 0;
  for (const day of DAYS) {
    const buckets: number[] = [];
    for (const start of MOBILE_BUCKET_STARTS) {
      let sum = 0;
      for (let h = start; h < start + MOBILE_BUCKET_HOURS; h += 1) {
        sum += grid[day]?.[h] ?? 0;
      }
      buckets.push(sum);
      if (sum > mobileMax) mobileMax = sum;
    }
    mobileGrid[day] = buckets;
  }

  function toggleSelect(next: Selected) {
    setSelected((prev) => {
      if (
        prev &&
        prev.day === next.day &&
        prev.hour === next.hour &&
        prev.span === next.span
      ) {
        return null;
      }
      return next;
    });
  }

  function isSelected(day: string, hour: number, span: number): boolean {
    return (
      selected !== null &&
      selected.day === day &&
      selected.hour === hour &&
      selected.span === span
    );
  }

  return (
    <div>
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[36px_repeat(24,minmax(0,1fr))] gap-px">
              <div className="h-6" />
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className={cn(
                    "text-center font-mono text-[10px]",
                    h % 6 === 0 ? "text-slate-700 dark:text-slate-300 font-medium dark:text-slate-200" : "text-slate-500 dark:text-slate-400",
                  )}
                  style={{ visibility: h % 3 === 0 ? "visible" : "hidden" }}
                >
                  {h}
                </div>
              ))}
              {DAYS.map((day) => {
                const isWeekend = day === "SATURDAY" || day === "SUNDAY";
                return (
                  <Fragment key={day}>
                    <div
                      className={cn(
                        "flex h-6 items-center justify-end pr-2 text-[11px]",
                        isWeekend ? "font-semibold text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400",
                      )}
                    >
                      {tDay(day)}
                    </div>
                    {Array.from({ length: 24 }, (_, h) => {
                      const count = grid[day]?.[h] ?? 0;
                      const isHover =
                        hover && hover.day === day && hover.hour === h && hover.span === 1;
                      const isSel = isSelected(day, h, 1);
                      return (
                        <button
                          key={`${day}-${h}`}
                          type="button"
                          tabIndex={count > 0 ? 0 : -1}
                          onMouseEnter={() => setHover({ day, hour: h, count, span: 1 })}
                          onMouseLeave={() => setHover(null)}
                          onFocus={() => setHover({ day, hour: h, count, span: 1 })}
                          onBlur={() => setHover(null)}
                          onClick={() => toggleSelect({ day, hour: h, count, span: 1 })}
                          aria-label={t("tooltip", { day: tDay(day), hour: h, count })}
                          aria-pressed={isSel}
                          className={cn(
                            "h-6 rounded-md transition-all duration-150 ease-out",
                            colorFor(count, max),
                            count === 0 && "ring-1 ring-inset ring-slate-200/70 dark:ring-slate-700/50",
                            isHover && "scale-110 ring-2 ring-accent-700 ring-offset-1 dark:ring-accent-400 dark:ring-offset-slate-950",
                            isSel && "scale-110 ring-2 ring-accent-700 ring-offset-1 dark:ring-accent-400 dark:ring-offset-slate-950",
                          )}
                        />
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="block md:hidden">
        <div className="grid grid-cols-[36px_repeat(6,minmax(0,1fr))] gap-px">
          <div className="h-5" />
          {MOBILE_BUCKET_STARTS.map((h) => (
            <div
              key={h}
              className="text-center font-mono text-[10px] font-medium text-slate-700 dark:text-slate-200"
            >
              {h}
            </div>
          ))}
          {DAYS.map((day) => {
            const isWeekend = day === "SATURDAY" || day === "SUNDAY";
            return (
              <Fragment key={day}>
                <div
                  className={cn(
                    "flex h-7 items-center justify-end pr-2 text-[11px]",
                    isWeekend ? "font-semibold text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400",
                  )}
                >
                  {tDay(day)}
                </div>
                {MOBILE_BUCKET_STARTS.map((startHour, idx) => {
                  const count = mobileGrid[day]?.[idx] ?? 0;
                  const isHover =
                    hover &&
                    hover.day === day &&
                    hover.hour === startHour &&
                    hover.span === MOBILE_BUCKET_HOURS;
                  const isSel = isSelected(day, startHour, MOBILE_BUCKET_HOURS);
                  return (
                    <button
                      key={`${day}-m-${startHour}`}
                      type="button"
                      tabIndex={count > 0 ? 0 : -1}
                      onMouseEnter={() =>
                        setHover({ day, hour: startHour, count, span: MOBILE_BUCKET_HOURS })
                      }
                      onMouseLeave={() => setHover(null)}
                      onFocus={() =>
                        setHover({ day, hour: startHour, count, span: MOBILE_BUCKET_HOURS })
                      }
                      onBlur={() => setHover(null)}
                      onClick={() =>
                        toggleSelect({
                          day,
                          hour: startHour,
                          count,
                          span: MOBILE_BUCKET_HOURS,
                        })
                      }
                      aria-label={t("tooltipBucket", {
                        day: tDay(day),
                        from: startHour,
                        to: startHour + MOBILE_BUCKET_HOURS - 1,
                        count,
                      })}
                      aria-pressed={isSel}
                      className={cn(
                        "h-7 rounded-md transition-all duration-150 ease-out",
                        colorFor(count, mobileMax),
                        count === 0 && "ring-1 ring-inset ring-slate-200/70 dark:ring-slate-700/50",
                        isHover && "scale-105 ring-2 ring-accent-700 ring-offset-1",
                        isSel && "scale-105 ring-2 ring-accent-700 ring-offset-1",
                      )}
                    />
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex min-h-[1rem] min-w-0 items-center gap-2">
          <ActiveCellLabel
            active={selected ?? (hover && hover.count > 0 ? hover : null)}
            total={total}
            isSelected={selected !== null}
            tDay={tDay}
            t={t}
            onClear={() => setSelected(null)}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span>{t("less")}</span>
          <div className="h-2.5 w-2.5 rounded-[3px] bg-slate-50 dark:bg-slate-800/50 ring-1 ring-inset ring-slate-200 dark:bg-slate-800/60 dark:ring-slate-700/50" />
          <div className="h-2.5 w-2.5 rounded-[3px] bg-accent-100" />
          <div className="h-2.5 w-2.5 rounded-[3px] bg-accent-300" />
          <div className="h-2.5 w-2.5 rounded-[3px] bg-accent-500" />
          <div className="h-2.5 w-2.5 rounded-[3px] bg-accent-700" />
          <span>{t("more")}</span>
        </div>
      </div>
    </div>
  );
}

function colorFor(count: number, scale: number): string {
  if (count === 0) return "bg-slate-50 dark:bg-slate-800/60";
  if (scale === 0) return "bg-slate-50 dark:bg-slate-800/60";
  const intensity = Math.min(1, count / scale);
  if (intensity < 0.15) return "bg-accent-50 dark:bg-accent-500/15";
  if (intensity < 0.3) return "bg-accent-100 dark:bg-accent-500/25";
  if (intensity < 0.5) return "bg-accent-300 dark:bg-accent-500/45";
  if (intensity < 0.7) return "bg-accent-500 dark:bg-accent-500/70";
  if (intensity < 0.85) return "bg-accent-600 dark:bg-accent-500/85";
  return "bg-accent-700 dark:bg-accent-400";
}

function ActiveCellLabel({
  active,
  total,
  isSelected,
  tDay,
  t,
  onClear,
}: {
  active: Hover | Selected | null;
  total: number;
  isSelected: boolean;
  tDay: (key: string) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onClear: () => void;
}) {
  if (!active) return null;

  const dayLabel = tDay(active.day);
  const rangeLabel =
    active.span === 1
      ? t("detailHourly", { day: dayLabel, hour: active.hour })
      : t("detailBucket", {
          day: dayLabel,
          from: active.hour,
          to: active.hour + active.span - 1,
        });
  const share = total > 0 ? (active.count / total) * 100 : 0;
  const shareLabel = share >= 10 ? share.toFixed(0) : share.toFixed(1);

  return (
    <div
      role={isSelected ? "status" : undefined}
      aria-live={isSelected ? "polite" : undefined}
      className="flex min-w-0 items-center gap-2 font-mono"
    >
      <span className="truncate text-slate-700 dark:text-slate-200">{rangeLabel}</span>
      <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
        ·
      </span>
      <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">
        {t("detailClicks", { count: active.count })}
      </span>
      {total > 0 && active.count > 0 && (
        <>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
            ·
          </span>
          <span className="tabular-nums text-slate-500 dark:text-slate-400">
            {t("detailShare", { share: shareLabel })}
          </span>
        </>
      )}
      {isSelected && (
        <button
          type="button"
          onClick={onClear}
          aria-label={t("detailClose")}
          className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
