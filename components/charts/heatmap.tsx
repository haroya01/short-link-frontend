"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { HeatmapCell } from "@/types";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export function Heatmap({ data }: { data: HeatmapCell[] }) {
  const t = useTranslations("stats.heatmap");
  const tDay = useTranslations("stats.weekday");
  const tShared = useTranslations("stats");
  const [hover, setHover] = useState<{ day: string; hour: number; count: number } | null>(null);

  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-500">{tShared("noData")}</p>;
  }

  const grid: Record<string, Record<number, number>> = {};
  let max = 0;
  for (const d of DAYS) grid[d] = {};
  for (const cell of data) {
    if (!grid[cell.dayOfWeek]) grid[cell.dayOfWeek] = {};
    grid[cell.dayOfWeek][cell.hour] = cell.count;
    if (cell.count > max) max = cell.count;
  }

  /**
   * Six-step ramp from a barely-tinted "off" cell up to a saturated accent for the hottest hour.
   * Empty / zero cells get {@code bg-slate-50} (instead of {@code bg-slate-100}) so the resting
   * grid reads as a quiet substrate, not a separate visual layer competing with the accent
   * cells. The early steps (50 → 100 → 200) are deliberately small so a thin band of activity
   * — e.g. a quiet 03:00 hour with a single click — still distinguishes itself from a truly
   * empty hour.
   */
  function colorFor(count: number): string {
    if (count === 0) return "bg-slate-50";
    if (max === 0) return "bg-slate-50";
    const intensity = Math.min(1, count / max);
    if (intensity < 0.15) return "bg-accent-50";
    if (intensity < 0.3) return "bg-accent-100";
    if (intensity < 0.5) return "bg-accent-300";
    if (intensity < 0.7) return "bg-accent-500";
    if (intensity < 0.85) return "bg-accent-600";
    return "bg-accent-700";
  }

  return (
    <div>
      <p className="mb-2 text-[10px] text-slate-400 sm:hidden">← scroll →</p>
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
                    hover && hover.day === day && hover.hour === h;
                  return (
                    <button
                      key={`${day}-${h}`}
                      type="button"
                      tabIndex={count > 0 ? 0 : -1}
                      onMouseEnter={() => setHover({ day, hour: h, count })}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover({ day, hour: h, count })}
                      onBlur={() => setHover(null)}
                      aria-label={t("tooltip", { day: tDay(day), hour: h, count })}
                      className={cn(
                        "h-6 rounded-md transition-all duration-150 ease-out",
                        colorFor(count),
                        // Empty cells get a thin inset ring so the grid stays legible — without
                        // it, bg-slate-50 vanishes against the card's white surface and the row
                        // looks half-broken.
                        count === 0 && "ring-1 ring-inset ring-slate-200/70",
                        isHover && "scale-110 ring-2 ring-accent-700 ring-offset-1",
                      )}
                    />
                  );
                })}
              </Fragment>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="min-h-[1rem]">
            {hover && hover.count > 0 && (
              <span className="font-mono">
                {tDay(hover.day)} {String(hover.hour).padStart(2, "0")}:00 — {hover.count}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span>{t("less")}</span>
            <div className="h-2.5 w-2.5 rounded-sm bg-slate-50 ring-1 ring-inset ring-slate-200" />
            <div className="h-2.5 w-2.5 rounded-sm bg-accent-100" />
            <div className="h-2.5 w-2.5 rounded-sm bg-accent-300" />
            <div className="h-2.5 w-2.5 rounded-sm bg-accent-500" />
            <div className="h-2.5 w-2.5 rounded-sm bg-accent-700" />
            <span>{t("more")}</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
