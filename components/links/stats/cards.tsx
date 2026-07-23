"use client";

import { Bot, Clock, IdCard, MousePointerClick, TrendingUp, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCountUp } from "@/lib/animations";
import { StatsHeroCore } from "@/components/links/stats/hero-panel";
import { cn, formatNumber } from "@/lib/utils";

type Props = {
  total: number;
  human: number;
  bot: number;
  unique?: number | null;
  /**
   * Clicks attributed to the owner's public profile page (sourceChannel LIKE 'profile-%').
   * Renders an extra KPI card only when {@code > 0} — most short links aren't on a profile
   * and don't need the slot.
   */
  profileClicks?: number | null;
  timeToFirstClickMinutes?: number | null;
  velocityRatio?: number | null;
  /** 일별 클릭 시계열(카운트만) — 있으면 히어로 카드에 자가-드로잉 스파크라인. */
  dailySeries?: number[] | null;
  animate?: boolean;
  /**
   * Called when a card is clicked. Hosts on a tabbed surface use this to switch tab + scroll;
   * single-page hosts can omit it and the card falls back to in-page {@code scrollIntoView}.
   */
  onNavigate?: (section: string) => void;
};

/**
 * Six-up KPI grid that anchors the stats page. Hero (total clicks) is a {@code rounded-2xl}
 * flat card sized 1.5× the others so the eye lands there first; satellite cards are also
 * {@code rounded-2xl} per AGENTS §1 (16 px canonical corner token). Each card is clickable — jump-scrolls
 * to the matching detail section, turning the KPI grid into a navigation control rather than
 * dead chrome. Hover state lifts each card {@code -translate-y-0.5} + soft shadow; active state
 * snaps it back with a {@code scale(0.99)} press tactile.
 */
export function StatsCards({
  total,
  human,
  bot,
  unique,
  profileClicks,
  timeToFirstClickMinutes,
  velocityRatio,
  dailySeries,
  animate = true,
  onNavigate,
}: Props) {
  const t = useTranslations("stats.kpi");
  const hasUnique = typeof unique === "number" && Number.isFinite(unique);
  const hasVelocity = typeof velocityRatio === "number" && Number.isFinite(velocityRatio);
  const hasLatency =
    typeof timeToFirstClickMinutes === "number" && Number.isFinite(timeToFirstClickMinutes);
  const showProfile =
    typeof profileClicks === "number" && Number.isFinite(profileClicks) && profileClicks > 0;
  // Zero-data state has no chart to scroll to and the page already shows a "share your link"
  // empty-state CTA above. Strip the interactive affordances on the KPI cards so the cursor /
  // hover / focus signal doesn't promise navigation we can't deliver.
  const interactive = total > 0;

  function jump(section: string) {
    if (!interactive) return;
    if (onNavigate) {
      onNavigate(section);
      return;
    }
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const humanRatio = total > 0 ? (human / total) * 100 : 0;
  const botRatio = total > 0 ? (bot / total) * 100 : 0;
  const uniqueRatio = hasUnique && human > 0 ? ((unique as number) / human) * 100 : 0;
  const profileRatio = showProfile && human > 0 ? ((profileClicks as number) / human) * 100 : 0;

  const showVelocity = hasVelocity && (velocityRatio as number) > 0;
  const showLatency = !showVelocity && hasLatency;

  const animatedTotal = useCountUp(total, 900, animate);

  return (
    <div
      className={cn(
        // Mobile: 2-col so KPI cards stack densely on iPhone; the hero "total" card spans both
        // columns (col-span-2 below). Tablet: 3-col, hero spans 3. Desktop keeps the bespoke
        // explicit track widths so the hero is 1.5x the others (Apple nested-radius math).
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4",
        showProfile
          ? "lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr]"
          : "lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]",
      )}
    >
      {/* 히어로 = 딥그린 시그니처 패널(StatsHeroCore) — 랜딩 무대 장면 3과 같은 컴포넌트.
          랜딩이 약속하는 카드가 실제 화면의 이 카드다(과장광고 방지 계약). */}
      <button
        type="button"
        onClick={() => jump("section-daily")}
        disabled={!interactive}
        aria-disabled={!interactive}
        className={cn(
          "relative col-span-2 overflow-hidden rounded-2xl border border-accent-800 p-0 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 ease-out sm:col-span-3 lg:col-span-1 dark:border-accent-500/30 dark:shadow-none",
          interactive
            ? "group cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(15,23,42,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.99]"
            : "cursor-default",
        )}
      >
        <StatsHeroCore
          label={t("totalClicks")}
          caption={`${t("human")} ${humanRatio.toFixed(0)}%`}
          total={animatedTotal}
          series={dailySeries}
          draw={animate ? "mount" : "static"}
          className="rounded-none"
        />
        {hasUnique && (
          <p className="bg-accent-900 px-5 pb-4 text-[11px] text-accent-100/70">
            <span className="font-mono font-medium tabular-nums text-white">
              {formatNumber(unique as number)}
            </span>{" "}
            {t("unique").toLowerCase()}{" "}
            <span className="text-accent-300/70">· {t("uniqueOfHuman", { ratio: uniqueRatio.toFixed(0) })}</span>
          </p>
        )}
      </button>

      <CountStat
        label={t("human")}
        target={human}
        icon={MousePointerClick}
        sub={`${humanRatio.toFixed(1)}%`}
        animate={animate}
        onJump={interactive ? () => jump("section-device") : undefined}
      />
      <CountStat
        label={t("unique")}
        target={hasUnique ? (unique as number) : null}
        icon={Users}
        sub={hasUnique ? t("uniqueOfHuman", { ratio: uniqueRatio.toFixed(0) }) : undefined}
        animate={animate}
        onJump={interactive ? () => jump("section-daily") : undefined}
      />
      <CountStat
        label={t("bot")}
        target={bot}
        icon={Bot}
        sub={`${botRatio.toFixed(1)}%`}
        muted
        animate={animate}
        onJump={interactive ? () => jump("section-bots") : undefined}
      />
      {showProfile && (
        <CountStat
          label={t("profile")}
          target={profileClicks as number}
          icon={IdCard}
          sub={t("profileSub", { ratio: profileRatio.toFixed(0) })}
          animate={animate}
          onJump={interactive ? () => jump("section-sources") : undefined}
        />
      )}
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
        onJump={interactive ? () => jump("section-hourly") : undefined}
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
  onJump,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  muted?: boolean;
  onJump?: () => void;
}) {
  const interactive = typeof onJump === "function";
  return (
    <button
      type="button"
      onClick={onJump}
      disabled={!interactive}
      aria-disabled={!interactive}
      className={cn(
        "flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 ease-out dark:shadow-none",
        interactive
          ? "group cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.99] dark:hover:border-slate-700"
          : "cursor-default",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400 transition-colors group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200">
          {label}
        </span>
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out",
            muted ? "text-slate-400 dark:text-slate-500" : "text-slate-500 dark:text-slate-400",
            interactive && "group-hover:scale-110",
          )}
        />
      </div>
      <p className="mt-2 font-mono text-[22px] font-semibold leading-none tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </p>
      {sub && <p className="mt-2 truncate text-[11px] text-slate-500 dark:text-slate-400">{sub}</p>}
    </button>
  );
}

function CountStat({
  label,
  target,
  sub,
  icon,
  muted,
  onJump,
  animate = true,
}: {
  label: string;
  target: number | null;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  muted?: boolean;
  onJump?: () => void;
  animate?: boolean;
}) {
  const animated = useCountUp(target ?? 0, 700, animate && target !== null);
  const display = target === null ? "—" : formatNumber(animated);
  return (
    <Stat label={label} value={display} sub={sub} icon={icon} muted={muted} onJump={onJump} />
  );
}

function formatLatency(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
