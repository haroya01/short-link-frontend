import { useId } from "react";
import { cn, formatNumber } from "@/lib/utils";

type Props = {
  /** 좌상단 라벨 (호출부에서 로케일 처리) */
  label: string;
  /** 우상단 mono 캡션 — 예: "30D · HUMAN 92%" */
  caption: string;
  /** 표시 수치 (카운트업이 필요하면 호출부에서 애니메이트된 값을 넘긴다) */
  total: number;
  /** 일별 클릭 시계열 — 없으면 스파크라인 생략 */
  series?: number[] | null;
  /**
   * 스파크라인 드로잉 모드:
   *  mount  = 실제 통계 화면 — 마운트 시 1회 자가-드로잉(모션=정보, §10 합격)
   *  scroll = 무대(랜딩) — view() 타임라인에 물림(§11)
   *  static = 항상 완성 상태 (프리렌더/RM 폴백은 CSS 가 소유)
   */
  draw?: "mount" | "scroll" | "static";
  className?: string;
};

/**
 * 딥그린 통계 히어로 패널 — 실제 통계 화면(StatsCards 히어로 카드)과 랜딩 무대 장면 3이
 * **같은 컴포넌트**를 렌더한다. 랜딩이 보여주는 카드 = 제품에 실존하는 카드라는 계약
 * (과장광고 방지)이므로, 이 파일을 고치면 두 표면이 함께 변한다는 걸 전제로 고칠 것.
 */
export function StatsHeroCore({ label, caption, total, series, draw = "static", className }: Props) {
  const gradId = useId();
  const points = buildPoints(series);
  return (
    <div className={cn("flex flex-col rounded-2xl bg-accent-900 p-5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-tagline text-accent-300">
          {label}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-tagline text-accent-300/80">
          {caption}
        </span>
      </div>
      <p className="mt-3 font-mono text-[34px] font-bold leading-none tracking-tight tabular-nums text-white">
        {formatNumber(total)}
      </p>
      {points && (
        <svg viewBox="0 0 320 88" fill="none" aria-hidden className="mt-auto w-full pt-4">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6EE7B7" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          {/* 선 아래 면 채움 — 맨 선만 있으면 필드가 텅 빈 골짜기로 읽힌다(딥그린 위 질량 부여) */}
          <polygon points={`0,83 ${points.line} ${points.lastX},83`} fill={`url(#${gradId})`} />
          <polyline
            points={points.line}
            pathLength={1}
            className={cn(
              "stroke-accent-300",
              draw === "mount" && "hero-draw-once",
              draw === "scroll" && "stage-draw",
            )}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={points.lastX} cy={points.lastY} r="3" className="fill-accent-200" />
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
