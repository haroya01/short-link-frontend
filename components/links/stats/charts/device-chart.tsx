"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import type { DeviceClick } from "@/types";

type Props = { data: DeviceClick[]; subgrid?: boolean };

function DeviceChartImpl({ data, subgrid = false }: Props) {
  const t = useTranslations("stats");
  return (
    <BreakdownList items={data.map((d) => ({ label: deviceLabel(d.device, t), count: d.count }))} subgrid={subgrid} />
  );
}

function deviceLabel(device: string, t: ReturnType<typeof useTranslations>): string {
  switch (device) {
    case "mobile":
      return t("device.mobile");
    case "desktop":
      return t("device.desktop");
    case "tablet":
      return t("device.tablet");
    case "bot":
      return t("device.bot");
    case "unknown":
      return t("device.unknown");
    default:
      return device;
  }
}

// 부모 상태 변화(라이브 틱·기간 프리셋)에 데이터가 같으면 재렌더 생략 — 개요 부드러움의 절반.
export const DeviceChart = memo(DeviceChartImpl);
