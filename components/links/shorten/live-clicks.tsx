"use client";

import { useTranslations } from "next-intl";
import { useClickStream, type LiveClick, type UseClickStreamResult } from "@/hooks/use-click-stream";
import { cn } from "@/lib/utils";
import { useStatsLabels } from "@/lib/stats-labels";

type Props = {
  shortCode: string;
  claimToken?: string;
  onTick?: () => void;
  label?: string;
  hideWhileWaiting?: boolean;
};

export function LiveClicks({ shortCode, claimToken, onTick, label, hideWhileWaiting = false }: Props) {
  const stream = useClickStream(shortCode, { claimToken, maxItems: 200, onTick });
  return <LiveClicksView stream={stream} label={label} hideWhileWaiting={hideWhileWaiting} />;
}

export function LiveClicksView({
  stream: { items, connected, count, bots },
  label,
  hideWhileWaiting = false,
}: {
  stream: UseClickStreamResult;
  label?: string;
  hideWhileWaiting?: boolean;
}) {
  if (hideWhileWaiting) {
    return (
      <div
        aria-live="polite"
        className={cn(
          "grid transition-[grid-template-rows] duration-500 ease-[var(--ease)] motion-reduce:transition-none",
          count > 0 ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="-ml-2 min-h-0 overflow-hidden pl-2">
          {count > 0 && <LiveLine items={items} count={count} bots={bots} label={label} className="pt-3" />}
        </div>
      </div>
    );
  }
  if (!connected && count === 0) return null;
  return <LiveLine items={items} count={count} bots={bots} label={label} live />;
}

function LiveLine({
  items,
  count,
  bots,
  label,
  live = false,
  className,
}: {
  items: LiveClick[];
  count: number;
  bots: number;
  label?: string;
  live?: boolean;
  className?: string;
}) {
  const t = useTranslations("result");
  const labels = useStatsLabels();
  const latest = items[0];
  const people = count - bots;
  const detail = latest
    ? [latest.countryCode && labels.country(latest.countryCode), latest.bot ? labels.device("bot") : latest.deviceClass && labels.device(latest.deviceClass), latest.channel && labels.channel(latest.channel)].filter(Boolean).join(" · ")
    : "";

  return (
    <p
      data-testid="live-clicks"
      aria-live={live ? "polite" : undefined}
      className={cn("flex min-h-6 flex-wrap items-center gap-x-2 text-[13px] text-slate-500 dark:text-slate-400", className)}
    >
      <span
        key={count}
        aria-hidden
        className={`relative inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500 ${count > 0 ? "live-dot-once" : ""}`}
      />
      {label && <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>}
      {count === 0 ? (
        <span>{t("liveWaiting")}</span>
      ) : (
        <>
          <span className="inline-flex overflow-hidden">
            <span key={people} className="count-roll font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {t("liveCount", { count: people })}
            </span>
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
