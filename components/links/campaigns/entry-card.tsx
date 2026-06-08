"use client";

import { ArrowRight, QrCode } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Dashboard 상단 발견 카드 — 일반 단축 URL 사용자에게 QR 캠페인이라는 *다른 모드* 의 존재를
 * 알린다. 매번 보일 만큼 prominent 하되, "내 링크" 의 메인 자리를 빼앗지 않는 가벼운 톤.
 */
export function CampaignsEntryCard() {
  const t = useTranslations("campaignApp.entry");
  return (
    <Link
      href="/campaigns"
      className="profile-card group block overflow-hidden rounded-2xl border border-accent-200 bg-gradient-to-br from-accent-50 via-white to-white px-4 py-4 sm:px-5 sm:py-5"
    >
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
        <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-white dark:bg-slate-900 text-accent-700 dark:text-accent-400 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-accent-200/60">
          <QrCode className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
              {t("title")}
            </h2>
            <span className="rounded-full bg-white dark:bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent-700 dark:text-accent-400 ring-1 ring-accent-200">
              {t("badge")}
            </span>
          </div>
          <p className="mt-1 text-[12px] leading-snug text-slate-600 dark:text-slate-300 sm:text-[13px]">
            {t("description")}
          </p>
        </div>
        <div className="flex items-center gap-1.5 self-end text-[13px] font-medium text-accent-700 dark:text-accent-400 transition-transform group-hover:translate-x-0.5 sm:self-center">
          {t("cta")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </div>
      </div>
    </Link>
  );
}
