"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Sparkline } from "@/components/links/stats/sparkline";
import type { LinkStats } from "@/types";

type ChapterKey = "who" | "when" | "where";

/**
 * 1층(개요)의 챕터 카드 3장 — 각 장의 지배적 시각 요약 + mono 데이터 캡션을 실어,
 * "필요한 것"이 먼저 들어오고 클릭하면 그 장의 상세(2층)로 내려간다. 뎁스의 문.
 * 캡션은 로케일 무관 mono 데이터 토큰(HERO 카드의 "30D · HUMAN 92%" 문법).
 */
export function ChapterCards({
  data,
  onOpen,
}: {
  data: LinkStats;
  onOpen: (chapter: ChapterKey) => void;
}) {
  const t = useTranslations("stats");
  const total = data.totalClicks ?? 0;

  const humanPct = total > 0 ? Math.round(((data.humanClicks ?? 0) / total) * 100) : null;
  const devices = data.deviceClicks ?? [];
  const deviceSum = devices.reduce((s, d) => s + d.count, 0);
  const mobile = devices.find((d) => d.device.toLowerCase().includes("mobile"));
  const mobilePct = mobile && deviceSum > 0 ? Math.round((mobile.count / deviceSum) * 100) : null;

  const dailyCounts = (data.dailyClicks ?? []).map((d) => d.count);
  const peakHour = typeof data.peakHour === "number" ? data.peakHour : null;

  const hosts = data.referrerHostClicks ?? [];
  const hostSum = hosts.reduce((s, h) => s + h.count, 0);
  const countries = data.countryClicks ?? [];
  const countrySum = countries.reduce((s, c) => s + c.count, 0);
  const topCountry = countries[0];
  const countryPct =
    topCountry && countrySum > 0 ? Math.round((topCountry.count / countrySum) * 100) : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <ChapterCard
        index={1}
        title={t("chapters.who")}
        caption={joinTokens([
          humanPct !== null ? `human ${humanPct}%` : null,
          mobilePct !== null ? `mobile ${mobilePct}%` : null,
        ])}
        onOpen={() => onOpen("who")}
      >
        {/* 기기 구성 미니 비율바 — 상세의 DeviceChart 문법 축약 */}
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {deviceSum > 0 &&
            devices.slice(0, 4).map((d, i) => (
              <span
                key={d.device}
                className={
                  ["bg-accent-600", "bg-accent-800", "bg-accent-400", "bg-accent-200"][i] ??
                  "bg-accent-200"
                }
                style={{ width: `${(d.count / deviceSum) * 100}%` }}
              />
            ))}
        </div>
      </ChapterCard>

      <ChapterCard
        index={2}
        title={t("chapters.when")}
        caption={joinTokens([
          peakHour !== null ? `peak ${String(peakHour).padStart(2, "0")}:00` : null,
          dailyCounts.length > 0 ? "30d" : null,
        ])}
        onOpen={() => onOpen("when")}
      >
        {dailyCounts.length > 1 ? (
          <Sparkline
            values={dailyCounts}
            width={180}
            height={28}
            className="w-full text-accent-600 dark:text-accent-400"
          />
        ) : (
          <div className="h-7" />
        )}
      </ChapterCard>

      <ChapterCard
        index={3}
        title={t("chapters.where")}
        caption={joinTokens([
          topCountry && countryPct !== null ? `${topCountry.country} ${countryPct}%` : null,
        ])}
        onOpen={() => onOpen("where")}
      >
        {/* 상위 유입 3곳 미니 순위 — 상세의 BreakdownList 축약 */}
        <div className="space-y-1.5">
          {hosts.slice(0, 3).map((h) => (
            <div key={h.host} className="flex items-center gap-2">
              <span className="w-24 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {h.host}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <span
                  className="block h-full rounded-full bg-accent-600 dark:bg-accent-400"
                  style={{ width: hostSum > 0 ? `${(h.count / hostSum) * 100}%` : 0 }}
                />
              </span>
            </div>
          ))}
          {hosts.length === 0 && <div className="h-7" />}
        </div>
      </ChapterCard>
    </div>
  );
}

function ChapterCard({
  index,
  title,
  caption,
  children,
  onOpen,
}: {
  index: number;
  title: string;
  caption: string;
  children: React.ReactNode;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={title}
      className="focus-ring group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-accent-500/50"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-tagline text-accent-700 dark:text-accent-400">
            {String(index).padStart(2, "0")}
          </span>
          <span className="text-[16px] font-semibold tracking-headline text-slate-900 dark:text-slate-100">
            {title}
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-all duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-accent-700 dark:group-hover:text-accent-400" />
      </div>
      <div className="min-h-[28px]">{children}</div>
      <p className="font-mono text-[11px] uppercase tracking-tagline text-slate-500 dark:text-slate-400">
        {caption || "—"}
      </p>
    </button>
  );
}

function joinTokens(tokens: Array<string | null>): string {
  return tokens.filter(Boolean).join(" · ");
}
