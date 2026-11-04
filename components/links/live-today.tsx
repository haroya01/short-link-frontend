"use client";

import { useTranslations } from "next-intl";
import type { AccountLiveClick } from "@/hooks/use-account-click-stream";
import { cn } from "@/lib/utils";

export type LiveTodayState = { extra: number; at: number; seq: number; latest: AccountLiveClick | null };

export const LIVE_TODAY_START: LiveTodayState = { extra: 0, at: 0, seq: 0, latest: null };

export function ownerDay(at: string, timeZone: string): string | null {
  const date = new Date(at);
  if (!Number.isFinite(+date)) return null;
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  } catch {
    return null;
  }
}

export function crossedDay(click: AccountLiveClick, overview: { updatedAt: string; timezone: string } | undefined): boolean {
  if (!overview) return false;
  const day = ownerDay(overview.updatedAt, overview.timezone);
  const clickDay = ownerDay(click.occurredAt, overview.timezone);
  return day != null && clickDay != null && clickDay !== day;
}

export function arriveToday(prev: LiveTodayState, click: AccountLiveClick, at: number, crossed: boolean): LiveTodayState {
  const carried = prev.at === at ? prev.extra : 0;
  return { extra: crossed ? 0 : carried + 1, at, seq: prev.seq + 1, latest: click };
}

export function todayCount(clicksToday: number, state: LiveTodayState, at: number): number {
  return clicksToday + (state.at === at ? state.extra : 0);
}

export function LiveToday({
  count,
  latest,
  seq,
  live,
}: {
  count: number;
  latest: AccountLiveClick | null;
  seq: number;
  live: boolean;
}) {
  const t = useTranslations("dashboard");
  const detail = latest ? [latest.countryCode, latest.deviceClass, latest.channel].filter(Boolean).join(" · ") : "";

  return (
    <span data-testid="live-today" data-live={live ? "on" : "off"} className="live-arrive flex min-w-0 items-center gap-x-2">
      <span
        key={`dot-${seq}`}
        aria-hidden
        className={cn(
          "relative inline-block h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-300 ease-[var(--ease)] motion-reduce:transition-none",
          live ? "bg-accent-500" : "bg-slate-300 dark:bg-slate-600",
          live && seq > 0 && "live-dot-once",
        )}
      />
      <span className="inline-flex shrink-0 overflow-hidden">
        <span
          key={count}
          className={cn("font-semibold tabular-nums text-slate-900 dark:text-slate-100", seq > 0 && "count-roll")}
        >
          {t("liveToday", { count })}
        </span>
      </span>
      {latest && (
        <span key={`detail-${seq}`} className="live-arrive ml-1 min-w-0 truncate">
          <span className="font-mono">/{latest.shortCode}</span>
          {detail && ` · ${detail}`}
        </span>
      )}
    </span>
  );
}
