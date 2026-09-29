"use client";

import { useParams } from "next/navigation";
import { StatsBackLink } from "./[code]/_components/back-button";
import { StatsSkeleton } from "./[code]/_components/stats-skeleton";

/**
 * 통계로 들어가는 탭이 서버 왕복을 기다리지 않고 바로 커밋되게 하는 자리. 대시보드·메인에서 오면 경로가
 * 처음 갈라지는 세그먼트가 `stats` 라 여기(그 세그먼트)에 있어야 프리페치에 실린다([code] 아래에 두면
 * 쓰이지 않는다). 페이지의 로딩 상태와 같은 마크업이고, 헤더 스켈레톤의 /코드 가 대시보드 행의 /코드 와
 * view-transition 페어(link-code)를 이뤄 모핑이 이 상태로 착지한다.
 */
export default function StatsLoading() {
  const { code } = useParams<{ code?: string }>();
  return (
    <div className="container max-w-6xl space-y-5 py-10">
      <StatsBackLink />
      <StatsSkeleton shortCode={code} />
    </div>
  );
}
