"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** 통계 머리 위 '← 내 링크' — 브라우저 뒤로를 흉내 내지 않고 늘 대시보드로. 라우트 로딩 상태와 페이지가 같이 쓴다. */
export function StatsBackLink() {
  const t = useTranslations("nav");
  return (
    <Link
      href="/dashboard"
      className="touch-target focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
      {t("myLinks")}
    </Link>
  );
}
