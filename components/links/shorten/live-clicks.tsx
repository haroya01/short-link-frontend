"use client";

import { useTranslations } from "next-intl";
import { useClickStream, type LiveClick } from "@/hooks/use-click-stream";
import { cn } from "@/lib/utils";

type Props = {
  shortCode: string;
  claimToken?: string;
  onTick?: () => void;
  label?: string;
  hideWhileWaiting?: boolean;
};

export function LiveClicks({ shortCode, claimToken, onTick, label, hideWhileWaiting = false }: Props) {
  const { items, connected, count } = useClickStream(shortCode, { claimToken, maxItems: 200, onTick });

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
          {count > 0 && <LiveLine items={items} count={count} label={label} className="pt-3" />}
        </div>
      </div>
    );
  }
  if (!connected && count === 0) return null;
  return <LiveLine items={items} count={count} label={label} live />;
}

function LiveLine({
  items,
  count,
  label,
  live = false,
  className,
}: {
  items: LiveClick[];
  count: number;
  label?: string;
  live?: boolean;
  className?: string;
}) {
  const t = useTranslations("result");
  const latest = items[0];
  const bots = items.filter((item) => item.bot).length;
  const people = items.length - bots;
  const detail = latest ? [latest.countryCode, latest.deviceClass, latest.channel].filter(Boolean).join(" · ") : "";

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
