"use client";

import { memo } from "react";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { useStatsLabels } from "@/lib/stats-labels";
import type { DeviceClick } from "@/types";

type Props = { data: DeviceClick[]; subgrid?: boolean };

function DeviceChartImpl({ data, subgrid = false }: Props) {
  const labels = useStatsLabels();
  return (
    <BreakdownList items={data.map((d) => ({ label: labels.device(d.device), count: d.count }))} subgrid={subgrid} />
  );
}

// 부모 상태 변화(라이브 틱·기간 프리셋)에 데이터가 같으면 재렌더 생략 — 개요 부드러움의 절반.
export const DeviceChart = memo(DeviceChartImpl);
