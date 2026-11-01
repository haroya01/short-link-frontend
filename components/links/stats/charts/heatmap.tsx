"use client";

import { memo, Fragment, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn, formatShare } from "@/lib/utils";
import type { HeatmapCell } from "@/types";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const MOBILE_BUCKET_HOURS = 4;
const MOBILE_BUCKETS = 24 / MOBILE_BUCKET_HOURS;
const MOBILE_BUCKET_STARTS = Array.from(
  { length: MOBILE_BUCKETS },
  (_, i) => i * MOBILE_BUCKET_HOURS,
);

const RAMP = [
  "bg-slate-50 ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:ring-slate-800",
  "bg-slate-200 dark:bg-slate-800",
  "bg-slate-300 dark:bg-slate-700",
  "bg-slate-400 dark:bg-slate-600",
  "bg-slate-500 dark:bg-slate-500",
] as const;

type Cell = { day: string; hour: number; count: number; span: number };

function same(a: Cell | null, day: string, hour: number, span: number) {
  return a !== null && a.day === day && a.hour === hour && a.span === span;
}

function rampStep(count: number, scale: number): number {
  if (count <= 0 || scale <= 0) return 0;
  return Math.min(4, Math.ceil((count / scale) * 4));
}

function hottest(grid: Record<string, number[]>, starts: number[], span: number): Cell | null {
  let best: Cell | null = null;
  for (const day of DAYS) {
    for (let idx = 0; idx < starts.length; idx += 1) {
      const count = grid[day]?.[idx] ?? 0;
      if (count > (best?.count ?? 0)) best = { day, hour: starts[idx], count, span };
    }
  }
  return best;
}

function HeatmapImpl({ data }: { data: HeatmapCell[] }) {
  const t = useTranslations("stats.heatmap");
  const tDay = useTranslations("stats.weekday");
  const tShared = useTranslations("stats");
  const [hover, setHover] = useState<Cell | null>(null);
  const [selected, setSelected] = useState<Cell | null>(null);

  if (data.length === 0) {
    return <p className="py-6 text-[13px] text-slate-500 dark:text-slate-400">{tShared("noData")}</p>;
  }

  const hourly: Record<string, number[]> = {};
  let max = 0;
  let total = 0;
  for (const d of DAYS) hourly[d] = Array.from({ length: 24 }, () => 0);
  for (const cell of data) {
    if (!hourly[cell.dayOfWeek]) hourly[cell.dayOfWeek] = Array.from({ length: 24 }, () => 0);
    hourly[cell.dayOfWeek][cell.hour] = cell.count;
    if (cell.count > max) max = cell.count;
    total += cell.count;
  }

  const buckets: Record<string, number[]> = {};
  let bucketMax = 0;
  for (const day of DAYS) {
    buckets[day] = MOBILE_BUCKET_STARTS.map((start) => {
      let sum = 0;
      for (let h = start; h < start + MOBILE_BUCKET_HOURS; h += 1) sum += hourly[day]?.[h] ?? 0;
      if (sum > bucketMax) bucketMax = sum;
      return sum;
    });
  }

  const hours = Array.from({ length: 24 }, (_, h) => h);
  const hotHour = hottest(hourly, hours, 1);
  const hotBucket = hottest(buckets, MOBILE_BUCKET_STARTS, MOBILE_BUCKET_HOURS);
  const pointed = selected ?? (hover && hover.count > 0 ? hover : null);
  const activeHour = pointed?.span === 1 ? pointed : pointed ? null : hotHour;
  const activeBucket = pointed?.span === MOBILE_BUCKET_HOURS ? pointed : pointed ? null : hotBucket;

  function toggleSelect(next: Cell) {
    setSelected((prev) => (same(prev, next.day, next.hour, next.span) ? null : next));
  }

  function cellButton(day: string, hour: number, count: number, span: number, scale: number, active: Cell | null) {
    const isActive = same(active, day, hour, span);
    const label =
      span === 1
        ? t("tooltip", { day: tDay(day), hour, count })
        : t("tooltipBucket", { day: tDay(day), from: hour, to: hour + span - 1, count });
    return (
      <button
        key={`${day}-${span}-${hour}`}
        type="button"
        tabIndex={count > 0 ? 0 : -1}
        data-active={isActive || undefined}
        onMouseEnter={() => setHover({ day, hour, count, span })}
        onMouseLeave={() => setHover(null)}
        onFocus={() => setHover({ day, hour, count, span })}
        onBlur={() => setHover(null)}
        onClick={() => toggleSelect({ day, hour, count, span })}
        aria-label={label}
        aria-pressed={same(selected, day, hour, span)}
        className={cn(
          span === 1 ? "h-6" : "h-7",
          "rounded-md transition-[background-color] duration-150 ease-[var(--ease)]",
          isActive ? "bg-accent-600" : RAMP[rampStep(count, scale)],
        )}
      />
    );
  }

  return (
    <div data-testid="heatmap">
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div data-testid="heatmap-hours" className="grid grid-cols-[36px_repeat(24,minmax(0,1fr))] gap-px">
              <div className="h-6" />
              {hours.map((h) => (
                <div
                  key={h}
                  className={cn(
                    "text-center tabular-nums text-[10px]",
                    h % 6 === 0 ? "font-medium text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400",
                  )}
                  style={{ visibility: h % 3 === 0 ? "visible" : "hidden" }}
                >
                  {h}
                </div>
              ))}
              {DAYS.map((day) => (
                <Fragment key={day}>
                  <DayLabel day={day} label={tDay(day)} className="h-6" />
                  {hours.map((h) => cellButton(day, h, hourly[day]?.[h] ?? 0, 1, max, activeHour))}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="block md:hidden">
        <div data-testid="heatmap-buckets" className="grid grid-cols-[36px_repeat(6,minmax(0,1fr))] gap-px">
          <div className="h-5" />
          {MOBILE_BUCKET_STARTS.map((h) => (
            <div key={h} className="text-center tabular-nums text-[10px] font-medium text-slate-700 dark:text-slate-200">
              {h}
            </div>
          ))}
          {DAYS.map((day) => (
            <Fragment key={day}>
              <DayLabel day={day} label={tDay(day)} className="h-7" />
              {MOBILE_BUCKET_STARTS.map((start, idx) =>
                cellButton(day, start, buckets[day]?.[idx] ?? 0, MOBILE_BUCKET_HOURS, bucketMax, activeBucket),
              )}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-col items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-h-[1rem] min-w-0 items-center gap-2">
          <span className="contents md:hidden">
            <ActiveCellLabel active={activeBucket} total={total} pinned={selected !== null} tDay={tDay} t={t} onClear={() => setSelected(null)} />
          </span>
          <span className="hidden md:contents">
            <ActiveCellLabel active={activeHour} total={total} pinned={selected !== null} tDay={tDay} t={t} onClear={() => setSelected(null)} />
          </span>
        </div>
        <div aria-hidden className="flex shrink-0 items-center gap-1.5">
          <span>{t("less")}</span>
          {RAMP.map((step) => (
            <span key={step} className={cn("h-2.5 w-2.5 rounded-sm", step)} />
          ))}
          <span>{t("more")}</span>
        </div>
      </div>
    </div>
  );
}

function DayLabel({ day, label, className }: { day: string; label: string; className: string }) {
  const weekend = day === "SATURDAY" || day === "SUNDAY";
  return (
    <div
      className={cn(
        "flex items-center justify-end pr-2 text-[11px]",
        className,
        weekend ? "font-semibold text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400",
      )}
    >
      {label}
    </div>
  );
}

function ActiveCellLabel({
  active,
  total,
  pinned,
  tDay,
  t,
  onClear,
}: {
  active: Cell | null;
  total: number;
  pinned: boolean;
  tDay: (key: string) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onClear: () => void;
}) {
  if (!active) return null;

  const dayLabel = tDay(active.day);
  const rangeLabel =
    active.span === 1
      ? t("detailHourly", { day: dayLabel, hour: active.hour })
      : t("detailBucket", { day: dayLabel, from: active.hour, to: active.hour + active.span - 1 });
  const shareLabel = formatShare(total > 0 ? active.count / total : 0);

  return (
    <div
      data-testid="heatmap-detail"
      role={pinned ? "status" : undefined}
      aria-live={pinned ? "polite" : undefined}
      className="flex min-w-0 items-center gap-2 whitespace-nowrap tabular-nums"
    >
      <span className="truncate text-slate-700 dark:text-slate-200">{rangeLabel}</span>
      <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
        ·
      </span>
      <span className="font-medium text-slate-900 dark:text-slate-100">{t("detailClicks", { count: active.count })}</span>
      {total > 0 && active.count > 0 && (
        <>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
            ·
          </span>
          <span className="text-slate-500 dark:text-slate-400">{t("detailShare", { share: shareLabel })}</span>
        </>
      )}
      {pinned && (
        <button
          type="button"
          onClick={onClear}
          aria-label={t("detailClose")}
          className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// 부모 상태 변화(라이브 틱·기간 프리셋)에 데이터가 같으면 재렌더 생략 — 개요 부드러움의 절반.
export const Heatmap = memo(HeatmapImpl);
