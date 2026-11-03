"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { BreakdownRows, type BreakdownRowsProps } from "./breakdown-rows";

function BreakdownListImpl(props: BreakdownRowsProps) {
  const t = useTranslations("stats");
  if (props.items.length === 0) {
    return (
      <p className={cn("text-[13px] text-slate-500 dark:text-slate-400", props.subgrid && "sm:col-span-full")}>
        {t("noData")}
      </p>
    );
  }
  return <BreakdownRows {...props} />;
}

// 부모 상태 변화(라이브 틱·기간 프리셋)에 데이터가 같으면 재렌더 생략 — 개요 부드러움의 절반.
export const BreakdownList = memo(BreakdownListImpl);
