"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { GroupChart, KpiRow, RecommendationCard } from "@/components/links/campaigns/stats-cards";
import { PromoActions, PromoExample, PromoHero, PromoLines, PromoSection } from "@/components/landing/promo";
import { MOCK_BY_LOCALE } from "./_lib/mock-data";
import { exampleCampaign } from "./_lib/example-stats";

const LINES = ["s2", "s3", "s6"] as const;

export default function QrCampaignsLandingPage() {
  const { authenticated } = useAuth();
  // 로그인 안 했어도 클릭 의도는 "캠페인 만들기". 로그인 후 dashboard 가 아니라 /campaigns/new
  // 로 이어지게 ?next= 부착 (ALLOWED_NEXT_PATHS 화이트리스트에 추가됨).
  const ctaHref = authenticated ? "/campaigns/new" : "/login?next=/campaigns/new";
  const locale = useLocale();
  const t = useTranslations("qrCampaigns");
  const tStats = useTranslations("campaignApp.campaignStats");
  const { stats, recommendation } = useMemo(
    () => exampleCampaign(MOCK_BY_LOCALE[locale] ?? MOCK_BY_LOCALE.en),
    [locale],
  );
  // 두 줄로 나뉜 문장을 한 줄로 이을 때 — 일본어는 띄어 쓰지 않는다.
  const join = locale === "ja" ? "" : " ";

  return (
    <div className="bg-white dark:bg-slate-950">
      {/* data-section-idx = 폰에서 한 화면에 들어와야 하는 단위(사용자 요구, e2e qr-campaigns-mobile-height). */}
      <div data-section-idx={0}>
        <PromoHero
          title={
            <>
              {t("hero.title1")}
              <br />
              <span className="font-medium">{t("hero.title2")}</span>
            </>
          }
          lead={t("hero.sub")}
          action={
            <Link href={ctaHref} className={buttonVariants({ variant: "accent", size: "xl" })}>
              {t("hero.cta")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          }
        />
      </div>

      <PromoSection title={t("example.title")} desc={t("example.desc")}>
        <PromoExample className="space-y-4">
          <div data-section-idx={1}>
            <KpiRow stats={stats} batchCount={stats.byBatch.length} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div data-section-idx={2}>
              <GroupChart title={tStats("groups.areaTitle")} hint={tStats("groups.areaHint")} groups={stats.byArea} />
            </div>
            <div data-section-idx={3}>
              <RecommendationCard data={recommendation} />
            </div>
          </div>
        </PromoExample>

        <div data-section-idx={4}>
          <PromoLines
            items={LINES.map((key) => ({
              title: `${t(`${key}.line1`)}${join}${t(`${key}.line2`)}`.replace(/[.。।]$/, ""),
              body: t(`${key}.aux`),
            }))}
          />

          <PromoActions>
            <Link href={ctaHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
              {t("hero.cta")}
            </Link>
          </PromoActions>
        </div>
      </PromoSection>
    </div>
  );
}
