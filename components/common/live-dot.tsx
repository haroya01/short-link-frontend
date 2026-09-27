import { cn } from "@/lib/utils";

/**
 * 라이브 닷 — "지금 살아있음"의 전역 신호. 히어로 티커·대시보드 행의 실시간 클릭 등
 * 실데이터가 흐르는 곳에만 쓴다(장식 금지 — 가짜 수치 금지 계약과 같은 축).
 * 링 파동은 모션 감소 설정에서 멈추고 코어 점만 남는다.
 */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative flex h-1.5 w-1.5 shrink-0", className)}>
      <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-accent-400 opacity-60" />
      <span className="relative inline-flex h-full w-full rounded-full bg-accent-500" />
    </span>
  );
}
