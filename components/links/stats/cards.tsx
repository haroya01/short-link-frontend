"use client";

import { useTranslations } from "next-intl";
import { useCountUp } from "@/lib/animations";
import { StatsHeroCore } from "@/components/links/stats/hero-panel";
import { cn, formatNumber } from "@/lib/utils";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";

type Props = {
  total: number;
  human: number;
  bot: number;
  unique?: number | null;
  /** sourceChannel LIKE 'profile-%' on the server; the card shows only when > 0. */
  profileClicks?: number | null;
  timeToFirstClickMinutes?: number | null;
  velocityRatio?: number | null;
  dailySeries?: number[] | null;
  animate?: boolean;
  /** Omit to fall back to in-page scrollIntoView. */
  onNavigate?: (section: string) => void;
  /** Hosts with fewer breakdowns omit navigation affordances for unavailable sections. */
  navigationTargets?: readonly string[];
  unit?: "click" | "visit";
};

const GRID_TRACKS: Record<number, string> = {
  2: "sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]",
  3: "sm:grid-cols-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr]",
  4: "sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]",
};

export function StatsCards({
  total,
  human,
  bot,
  unique,
  profileClicks,
  timeToFirstClickMinutes,
  velocityRatio,
  dailySeries,
  animate = false,
  onNavigate,
  navigationTargets,
  unit = "click",
}: Props) {
  const t = useTranslations("stats.kpi");
  const hasUnique = typeof unique === "number" && Number.isFinite(unique);
  const hasVelocity = typeof velocityRatio === "number" && Number.isFinite(velocityRatio);
  const hasLatency =
    typeof timeToFirstClickMinutes === "number" && Number.isFinite(timeToFirstClickMinutes);
  const showProfile =
    typeof profileClicks === "number" && Number.isFinite(profileClicks) && profileClicks > 0;
  // With zero data there is no section to jump to, so the cards drop their interactive affordances.
  const interactive = total > 0;
  const canNavigate = (section: string) => interactive && (!navigationTargets || navigationTargets.includes(section));

  function jump(section: string) {
    if (!canNavigate(section)) return;
    if (onNavigate) {
      onNavigate(section);
      return;
    }
    const reduced = prefersReducedMotion();
    document.getElementById(section)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  const botRatio = total > 0 ? (bot / total) * 100 : 0;
  const uniqueRatio = hasUnique && human > 0 ? ((unique as number) / human) * 100 : 0;
  const profileRatio = showProfile && human > 0 ? ((profileClicks as number) / human) * 100 : 0;

  // lib/stats-journal 의 MIN_TOTAL_FOR_INSIGHTS(10)와 같은 문턱이어야 한다.
  const showVelocity = hasVelocity && (velocityRatio as number) >= 1.5 && human >= 30;
  const showLatency = !showVelocity && hasLatency;
  const showActivity = showVelocity || showLatency;
  const satellites = 2 + (showProfile ? 1 : 0) + (showActivity ? 1 : 0);
  const visit = unit === "visit";

  const animatedHuman = useCountUp(human, 900, animate);

  return (
    <div
      className={cn(
        // 모바일 2열에서 마지막 카드가 홀수로 남으면 고아 — 풀폭으로 펴서 구멍을 없앤다.
        "grid grid-cols-2 gap-3 max-sm:[&>*:nth-child(even):last-child]:col-span-2 sm:gap-4",
        GRID_TRACKS[satellites],
      )}
    >
      {/* 홈의 통계 예시와 같은 StatsHeroCore 여야 한다: 랜딩이 보여 주는 카드가 이 카드다. */}
      <button
        type="button"
        onClick={() => jump("section-daily")}
        disabled={!canNavigate("section-daily")}
        aria-disabled={!canNavigate("section-daily")}
        className={cn(
          "relative col-span-full overflow-hidden rounded-2xl p-0 text-left shadow-card-flat transition-[transform,box-shadow] duration-200 ease-[var(--ease)] lg:col-span-1 dark:shadow-none",
          canNavigate("section-daily")
            ? "group cursor-pointer hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.99]"
            : "cursor-default",
        )}
      >
        <StatsHeroCore
          label={visit ? t("humanVisits") : t("human")}
          caption={`${visit ? t("totalVisits") : t("totalClicks")} ${formatNumber(total)}`}
          value={animatedHuman}
          series={dailySeries}
          draw={animate ? "mount" : "static"}
          className="h-full transition-colors group-hover:border-slate-300 dark:group-hover:border-slate-700"
        />
      </button>

      <CountStat
        label={t("unique")}
        target={hasUnique ? (unique as number) : null}
        sub={hasUnique ? t(visit ? "uniqueOfHumanVisits" : "uniqueOfHuman", { ratio: uniqueRatio.toFixed(0) }) : undefined}
        ratio={hasUnique ? uniqueRatio / 100 : undefined}
        animate={animate}
        onJump={canNavigate("section-daily") ? () => jump("section-daily") : undefined}
      />
      <CountStat
        label={t("bot")}
        target={bot}
        sub={`${botRatio.toFixed(1)}%`}
        ratio={botRatio / 100}
        muted
        animate={animate}
        onJump={canNavigate("section-bots") ? () => jump("section-bots") : undefined}
      />
      {showProfile && (
        <CountStat
          label={t("profile")}
          target={profileClicks as number}
          ratio={profileRatio / 100}
          sub={t("profileSub", { ratio: profileRatio.toFixed(0) })}
          animate={animate}
          onJump={canNavigate("section-sources") ? () => jump("section-sources") : undefined}
        />
      )}
      {showActivity && (
        <Stat
          label={showVelocity ? t("velocityHot") : t("ttfc")}
          value={
            showVelocity
              ? `${(velocityRatio as number).toFixed(1)}x`
              : formatLatency(timeToFirstClickMinutes as number)
          }
          sub={showVelocity ? t("vsBaseline") : t("afterCreation")}
          onJump={canNavigate("section-hourly") ? () => jump("section-hourly") : undefined}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  ratio,
  muted,
  onJump,
}: {
  label: string;
  value: string;
  sub?: string;
  ratio?: number;
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
        "flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-left shadow-card-flat transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease)] dark:shadow-none",
        interactive
          ? "group cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.99] dark:hover:border-slate-700"
          : "cursor-default",
      )}
    >
      <span
        className={cn(
          "truncate text-[13px] font-semibold transition-colors",
          muted
            ? "text-slate-400 dark:text-slate-400"
            : "text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200",
        )}
      >
        {label}
      </span>
      <p className="mt-2 text-[22px] font-semibold leading-none tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </p>
      {sub && <p className="mt-2 truncate text-[12px] text-slate-500 dark:text-slate-400">{sub}</p>}
      {typeof ratio === "number" && Number.isFinite(ratio) && (
        <span
          aria-hidden
          className="mt-3 block h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        >
          <span
            className={cn(
              "block h-full rounded-full",
              muted ? "bg-slate-300 dark:bg-slate-600" : "bg-accent-500 dark:bg-accent-400",
            )}
            style={{ width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` }}
          />
        </span>
      )}
    </button>
  );
}

function CountStat({
  label,
  target,
  sub,
  ratio,
  muted,
  onJump,
  animate = true,
}: {
  label: string;
  target: number | null;
  sub?: string;
  ratio?: number;
  muted?: boolean;
  onJump?: () => void;
  animate?: boolean;
}) {
  const animated = useCountUp(target ?? 0, 700, animate && target !== null);
  const display = target === null ? "—" : formatNumber(animated);
  return (
    <Stat label={label} value={display} sub={sub} ratio={ratio} muted={muted} onJump={onJump} />
  );
}

function formatLatency(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
