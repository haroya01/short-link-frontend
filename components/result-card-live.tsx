"use client";

import { useTranslations } from "next-intl";
import type { LiveClick } from "@/lib/use-click-stream";

type Props = {
  items: LiveClick[];
  connected: boolean;
  count: number;
};

const PREVIEW_ROWS = 3;

/**
 * Compact live click feed designed to nest inside {@link import("./result-card").ResultCard}. The
 * stats-page feed already has its own chrome (large title, big "waiting" panel) which would dwarf
 * the result card — this variant keeps the SSE wiring upstream in the parent and renders just the
 * status strip + top-3 rolling preview. Counter and connection state share the header line so the
 * widget reads as a status row, not a second card.
 */
export function ResultCardLive({ items, connected, count }: Props) {
  const t = useTranslations("result.live");
  const showRows = items.length > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <span
            className={
              "inline-block h-1.5 w-1.5 rounded-full " +
              (connected
                ? "animate-pulse bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                : "bg-slate-300")
            }
            aria-hidden
          />
          <span
            className={
              "font-mono uppercase tracking-wider " +
              (connected ? "text-emerald-700" : "text-slate-500")
            }
          >
            {t("label")}
          </span>
          {!showRows && (
            <span className="text-slate-400">· {t("tagline")}</span>
          )}
        </div>
        <span className="font-mono tabular-nums text-[12px] font-semibold text-slate-900">
          {t("clicks", { count })}
        </span>
      </div>

      {showRows ? (
        <ul className="mt-2.5 space-y-1">
          {items.slice(0, PREVIEW_ROWS).map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 text-[11px] animate-fade-in"
            >
              <span
                className="font-mono tabular-nums text-slate-500"
                suppressHydrationWarning
              >
                {formatTime(item.occurredAt)}
              </span>
              {item.countryCode && (
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                  {item.countryCode}
                </span>
              )}
              {item.deviceClass && (
                <span className="text-slate-600">{item.deviceClass}</span>
              )}
              {item.channel && (
                <span className="min-w-0 flex-1 truncate text-slate-500" title={item.channel}>
                  · {item.channel}
                </span>
              )}
              {item.bot && (
                <span className="ml-auto rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-amber-700">
                  {t("bot")}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-2 space-y-0.5 text-center">
          <p className="text-[12px] text-slate-500">{t("waiting")}</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
            {t("waitingHint")}
          </p>
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}
