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
    return <p className="py-8 text-center text-xs text-slate-500">{tShared("noData")}</p>;
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
                    h % 6 === 0 ? "text-slate-700 font-medium" : "text-slate-500",
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
                        isWeekend ? "font-semibold text-slate-700" : "text-slate-500",
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
                            count === 0 && "ring-1 ring-inset ring-slate-200/70",
                            isHover && "scale-110 ring-2 ring-accent-700 ring-offset-1",
                            isSel && "scale-110 ring-2 ring-accent-700 ring-offset-1",
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
              className="text-center font-mono text-[10px] font-medium text-slate-700"
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
                    isWeekend ? "font-semibold text-slate-700" : "text-slate-500",
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
                        count === 0 && "ring-1 ring-inset ring-slate-200/70",
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

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <div className="min-h-[1rem]">
          {hover && hover.count > 0 && (
            <span className="font-mono">
              {tDay(hover.day)}{" "}
              {hover.span === 1
                ? `${String(hover.hour).padStart(2, "0")}:00`
                : `${String(hover.hour).padStart(2, "0")}–${String(hover.hour + hover.span - 1).padStart(2, "0")}:59`}
              {" — "}
              {hover.count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span>{t("less")}</span>
          <div className="h-2.5 w-2.5 rounded-[3px] bg-slate-50 ring-1 ring-inset ring-slate-200" />
          <div className="h-2.5 w-2.5 rounded-[3px] bg-accent-100" />
          <div className="h-2.5 w-2.5 rounded-[3px] bg-accent-300" />
          <div className="h-2.5 w-2.5 rounded-[3px] bg-accent-500" />
          <div className="h-2.5 w-2.5 rounded-[3px] bg-accent-700" />
          <span>{t("more")}</span>
        </div>
      </div>

      {selected && (
        <SelectedDetail
          selected={selected}
          total={total}
          tDay={tDay}
          t={t}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function colorFor(count: number, scale: number): string {
  if (count === 0) return "bg-slate-50";
  if (scale === 0) return "bg-slate-50";
  const intensity = Math.min(1, count / scale);
  if (intensity < 0.15) return "bg-accent-50";
  if (intensity < 0.3) return "bg-accent-100";
  if (intensity < 0.5) return "bg-accent-300";
  if (intensity < 0.7) return "bg-accent-500";
  if (intensity < 0.85) return "bg-accent-600";
  return "bg-accent-700";
}

/**
 * Inline detail block — surfaces below the chart when the user clicks/taps a cell. Shows
 * day + time range, click count, and share-of-total. Closes on the same-cell click or the
 * explicit close button. Designed to live inside the existing chart card (no modal / portal)
 * so the user keeps the heatmap in view while scanning the detail.
 */
function SelectedDetail({
  selected,
  total,
  tDay,
  t,
  onClose,
}: {
  selected: Selected;
  total: number;
  tDay: (key: string) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onClose: () => void;
}) {
  const dayLabel = tDay(selected.day);
  const rangeLabel =
    selected.span === 1
      ? t("detailHourly", { day: dayLabel, hour: selected.hour })
      : t("detailBucket", {
          day: dayLabel,
          from: selected.hour,
          to: selected.hour + selected.span - 1,
        });
  const share = total > 0 ? (selected.count / total) * 100 : 0;
  const shareLabel = share >= 10 ? share.toFixed(0) : share.toFixed(1);

  return (
    <div
      role="region"
      aria-live="polite"
      className="mt-4 rounded-lg border border-accent-200 bg-accent-50/40 px-4 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-mono text-[12px] font-medium text-slate-900">{rangeLabel}</p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-base font-semibold tabular-nums text-slate-900">
              {t("detailClicks", { count: selected.count })}
            </span>
            {total > 0 && (
              <span className="font-mono text-[11px] text-slate-500">
                {t("detailShare", { share: shareLabel })}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">{t("detailHint")}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("detailClose")}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-900"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
