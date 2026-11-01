"use client";

import { useTranslations } from "next-intl";
import { useClickStream } from "@/hooks/use-click-stream";

export function LiveClicks({ shortCode, claimToken }: { shortCode: string; claimToken: string }) {
  const t = useTranslations("result");
  const { items, connected, count } = useClickStream(shortCode, { claimToken, maxItems: 200 });
  if (!connected && count === 0) return null;

  const latest = items[0];
  const bots = items.filter((item) => item.bot).length;
  const people = items.length - bots;
  const detail = latest ? [latest.countryCode, latest.deviceClass, latest.channel].filter(Boolean).join(" · ") : "";

  return (
    <p
      data-testid="live-clicks"
      aria-live="polite"
      className="flex min-h-6 flex-wrap items-center gap-x-2 text-[13px] text-slate-500 dark:text-slate-400"
    >
      <span
        key={count}
        aria-hidden
        className={`relative inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500 ${count > 0 ? "live-dot-once" : ""}`}
      />
      {count === 0 ? (
        <span>{t("liveWaiting")}</span>
      ) : (
        <>
          <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {t("liveCount", { count: people })}
          </span>
          {bots > 0 && <span className="tabular-nums">{t("liveBots", { count: bots })}</span>}
          {detail && (
            <span key={`detail-${count}`} className="live-arrive truncate">
              {detail}
            </span>
          )}
        </>
      )}
    </p>
  );
}
