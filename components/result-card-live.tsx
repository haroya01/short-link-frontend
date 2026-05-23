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
 * Compact live click feed for the result card. Earlier revisions wrapped this in its own bordered
 * panel with a "live · 통계 잡히는 중" header + a dashed "첫 클릭은 여기 흘러요" placeholder; that
 * read as a second card inside the card and earned a "too AI-like, make it more Apple" rewrite.
 * Now: a single status line (animated dot + count) does the empty state — the dot's pulse alone
 * carries "we're listening", no explainer copy. When clicks arrive, the rows fade in below the
 * status; nothing else changes. No labels, no descriptions, no second box.
 */
export function ResultCardLive({ items, connected, count }: Props) {
  const t = useTranslations("result.live");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={
            "inline-block h-1.5 w-1.5 rounded-full " +
            (connected
              ? "animate-pulse bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.45)]"
              : "bg-slate-300")
          }
        />
        <span className="font-mono tabular-nums text-[12px] text-slate-700">
          {t("clicks", { count })}
        </span>
      </div>

      {items.length > 0 && (
        <ul className="space-y-1">
          {items.slice(0, PREVIEW_ROWS).map((item) => (
            <li
              key={item.id}
              className="flex min-w-0 items-center gap-2 text-[11px] text-slate-500 animate-fade-in"
            >
              <span
                className="shrink-0 font-mono tabular-nums"
                suppressHydrationWarning
              >
                {formatTime(item.occurredAt)}
              </span>
              {item.countryCode && (
                <span className="shrink-0 font-mono text-[10px] text-slate-600">
                  {item.countryCode}
                </span>
              )}
              {item.deviceClass && (
                <span className="shrink-0">{item.deviceClass}</span>
              )}
              {item.channel && (
                <span className="min-w-0 flex-1 truncate" title={item.channel}>
                  · {item.channel}
                </span>
              )}
              {item.bot && (
                <span className="ml-auto shrink-0 rounded bg-amber-50 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wider text-amber-700">
                  {t("bot")}
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
