"use client";

import dynamic from "next/dynamic";

// recharts(~90KB gz)는 차트를 실제로 그릴 때만 받는다 — 이 차트를 쓰는 화면이 탭바·링크 프리페치로
// 불려도 청크가 딸려 오지 않게. 자리표시자는 차트와 같은 높이(일별: 최고점 줄 + h-72 트랙, 시간대:
// h-72 트랙)라 청크가 도착해도 아래 내용이 밀리지 않는다.
function ChartPlaceholder({ peakLine = false }: { peakLine?: boolean }) {
  return (
    <div className="w-full" aria-hidden>
      {peakLine && <p className="mb-2 text-[11px]">{" "}</p>}
      <div className="h-72 w-full animate-pulse rounded-lg bg-slate-100/70 dark:bg-slate-800/40" />
    </div>
  );
}

export const LazyDailyChart = dynamic(
  () => import("./daily-chart").then((m) => m.DailyChart),
  { ssr: false, loading: () => <ChartPlaceholder peakLine /> },
);

export const LazyHourChart = dynamic(
  () => import("./hour-chart").then((m) => m.HourChart),
  { ssr: false, loading: () => <ChartPlaceholder /> },
);
