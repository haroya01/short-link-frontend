"use client";

import { Bot, Clock, MousePointerClick, TrendingUp, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCountUp } from "@/lib/animations";
import { cn, formatNumber } from "@/lib/utils";

type Props = {
  total: number;
  human: number;
  bot: number;
  unique?: number | null;
  timeToFirstClickMinutes?: number | null;
  velocityRatio?: number | null;
};

export function StatsCards({
  total,
  human,
  bot,
  unique,
  timeToFirstClickMinutes,
  velocityRatio,
}: Props) {
  const t = useTranslations("stats.kpi");
  const hasUnique = typeof unique === "number" && Number.isFinite(unique);
  const hasVelocity = typeof velocityRatio === "number" && Number.isFinite(velocityRatio);
  const hasLatency =
    typeof timeToFirstClickMinutes === "number" && Number.isFinite(timeToFirstClickMinutes);

  const humanRatio = total > 0 ? (human / total) * 100 : 0;
  const botRatio = total > 0 ? (bot / total) * 100 : 0;
  const uniqueRatio = hasUnique && human > 0 ? ((unique as number) / human) * 100 : 0;

  const showVelocity = hasVelocity && (velocityRatio as number) > 0;
  const showLatency = !showVelocity && hasLatency;

  const animatedTotal = useCountUp(total, 900);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
      <button
        type="button"
        onClick={() => {
          document.getElementById("section-daily")?.scrollIntoView({ behavior: "smooth" });
        }}
        className="group relative overflow-hidden rounded-lg border border-accent-200 bg-gradient-to-br from-accent-50 via-accent-50/40 to-white p-5 text-left transition-all hover:border-accent-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-accent-700">
            {t("totalClicks")}
          </span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-600 text-white shadow-sm transition-transform group-hover:scale-110">
            <MousePointerClick className="h-3.5 w-3.5" />
          </span>
        </div>
        <p className="mt-3 font-mono text-4xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {formatNumber(animatedTotal)}
        </p>
        {hasUnique && (
          <p className="mt-2 text-[11px] text-slate-500">
            {formatNumber(unique as number)} {t("unique").toLowerCase()} ·{" "}
            {uniqueRatio.toFixed(0)}% of human
          </p>
        )}
        <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-accent-200/40 blur-2xl" />
      </button>

      <CountStat
        label={t("human")}
        target={human}
        icon={MousePointerClick}
        sub={`${humanRatio.toFixed(1)}%`}
        jumpTo="section-device"
      />
      <CountStat
        label={t("unique")}
        target={hasUnique ? (unique as number) : null}
        icon={Users}
        sub={hasUnique ? t("uniqueOfHuman", { ratio: uniqueRatio.toFixed(0) }) : undefined}
        jumpTo="section-daily"
      />
      <CountStat
        label={t("bot")}
        target={bot}
        icon={Bot}
        sub={`${botRatio.toFixed(1)}%`}
        muted
        jumpTo="section-bots"
      />
      <Stat
        label={
          showVelocity && (velocityRatio as number) >= 1.5
            ? t("velocityHot")
            : showVelocity
              ? t("velocityHour")
              : showLatency
                ? t("ttfc")
                : t("noActivity")
        }
        value={
          showVelocity
            ? `${(velocityRatio as number).toFixed(1)}x`
            : showLatency
              ? formatLatency(timeToFirstClickMinutes as number)
              : "—"
        }
        icon={showVelocity && (velocityRatio as number) >= 1.5 ? TrendingUp : Clock}
        sub={showVelocity ? t("vsBaseline") : showLatency ? t("afterCreation") : t("noData")}
        jumpTo="section-hourly"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  icon: Icon,
  muted,
  jumpTo,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  muted?: boolean;
  jumpTo?: string;
}) {
  function handleClick() {
    if (!jumpTo) return;
    document.getElementById(jumpTo)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!jumpTo}
      className={cn(
        "group flex flex-col rounded-lg border border-slate-200 bg-white p-4 text-left transition-all",
        jumpTo
          ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50/60 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          : "cursor-default",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="truncate text-[11px] font-medium uppercase tracking-wider text-slate-500 transition-colors group-hover:text-slate-700">
          {label}
        </span>
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform",
            muted ? "text-slate-500" : "text-slate-500",
            jumpTo && "group-hover:scale-110",
          )}
        />
      </div>
      <p className="mt-2 font-mono text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>
      {sub && <p className="mt-1 truncate text-[11px] text-slate-500">{sub}</p>}
    </button>
  );
}

function CountStat({
  label,
  target,
  sub,
  icon,
  muted,
  jumpTo,
}: {
  label: string;
  target: number | null;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  muted?: boolean;
  jumpTo?: string;
}) {
  const animated = useCountUp(target ?? 0, 700, target !== null);
  const display = target === null ? "—" : formatNumber(animated);
  return <Stat label={label} value={display} sub={sub} icon={icon} muted={muted} jumpTo={jumpTo} />;
}

function formatLatency(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
