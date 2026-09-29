import { memo, useId } from "react";
import { cn, formatNumber } from "@/lib/utils";

type Props = {
  /** 좌상단 라벨 (호출부에서 로케일 처리) */
  label: string;
  /** 우상단 캡션 — 예: "누적 전체 클릭 1,309" */
  caption: string;
  /** 큰 수치 = 봇을 뺀 사람 수치 (카운트업이 필요하면 호출부에서 애니메이트된 값을 넘긴다) */
  value: number;
  /** 일별 클릭 시계열 — 없으면 스파크라인 생략 */
  series?: number[] | null;
  /**
   * 스파크라인 드로잉 모드:
   *  mount  = 실제 통계 화면 — 마운트 시 1회 자가-드로잉(모션=정보)
   *  static = 항상 완성 상태 (홈의 예시·프리렌더/RM 폴백)
   */
  draw?: "mount" | "static";
  /** 라벨 옆 표시 — 랜딩처럼 데모 수치를 보여 줄 때 "예시" */
  badge?: string;
  className?: string;
};

/**
 * 통계 히어로 카드 — 공개 통계·블로그 분석(StatsCards)과 홈의 통계 예시 섹션이 **같은 컴포넌트**를
 * 렌더한다. 랜딩이 보여주는 카드 = 제품에 실존하는 카드라는 계약(과장광고 방지)이므로, 이 파일을
 * 고치면 두 표면이 함께 변한다. 모양·수치 기준(사람 클릭 먼저)은 주인 통계 화면의 머리와 같다.
 */
function StatsHeroCoreImpl({ label, caption, value, series, draw = "static", badge, className }: Props) {
  const gradId = useId();
  const points = buildPoints(series);
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
          {label}
          {badge && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {badge}
            </span>
          )}
        </span>
        <span className="tabular-nums text-[12px] text-slate-500 dark:text-slate-400">{caption}</span>
      </div>
      <p className="mt-3 text-[34px] font-bold leading-none tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
        {formatNumber(value)}
      </p>
      {points && (
        <svg viewBox="0 0 320 88" fill="none" aria-hidden className="mt-auto w-full pt-4">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polygon points={`0,83 ${points.line} ${points.lastX},83`} fill={`url(#${gradId})`} />
          <polyline
            points={points.line}
            pathLength={1}
            className={cn("stroke-accent-600 dark:stroke-accent-400", draw === "mount" && "hero-draw-once")}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={points.lastX} cy={points.lastY} r="3" className="fill-accent-600 dark:fill-accent-400" />
        </svg>
      )}
    </div>
  );
}

function buildPoints(series?: number[] | null) {
  if (!series || series.length < 2) return null;
  const w = 320;
  const h = 88;
  const max = Math.max(...series, 1);
  const step = w / (series.length - 1);
  const coords = series.map((v, i) => {
    const x = i * step;
    const y = h - (v / max) * (h - 10) - 5;
    return [x, y] as const;
  });
  return {
    line: coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "),
    lastX: coords[coords.length - 1][0],
    lastY: coords[coords.length - 1][1],
  };
}

// 부모 상태 변화(라이브 틱·기간 프리셋)에 데이터가 같으면 재렌더 생략 — 개요 부드러움의 절반.
export const StatsHeroCore = memo(StatsHeroCoreImpl);
