"use client";

import { ArrowRight, BarChart3 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MOCK_BY_LOCALE, type MockData } from "./_lib/mock-data";
import { MockBars, MockBatch, MockCases, MockKpi, MockPoster, MockTimeline } from "./_components/mocks";

const ROWS = [
  { key: "s2", Figure: MockBatch, aux: true },
  { key: "s3", Figure: MockPoster, aux: true },
  { key: "s4", Figure: MockBars, aux: true },
  { key: "s5", Figure: MockCases, aux: true },
  { key: "s6", Figure: MockTimeline, aux: false },
] as const satisfies readonly { key: string; Figure: React.ComponentType<{ mock: MockData }>; aux: boolean }[];

export default function QrCampaignsLandingPage() {
  const { authenticated } = useAuth();
  // 로그인 안 했어도 클릭 의도는 "캠페인 만들기". 로그인 후 dashboard 가 아니라 /campaigns/new
  // 로 이어지게 ?next= 부착 (ALLOWED_NEXT_PATHS 화이트리스트에 추가됨).
  const ctaHref = authenticated ? "/campaigns/new" : "/login?next=/campaigns/new";
  const locale = useLocale();
  const mock = MOCK_BY_LOCALE[locale] ?? MOCK_BY_LOCALE.en;
  const t = useTranslations("qrCampaigns");

  return (
    <div className="bg-white dark:bg-slate-950">
      <section data-section-idx={0} className="container max-w-5xl py-8 sm:py-16 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-accent-700 dark:text-accent-400">{t("hero.eyebrow")}</p>
            <h1 className="mt-2 break-keep text-headline-sm font-bold tracking-headline text-slate-900 dark:text-slate-100 sm:mt-3 sm:text-headline-md lg:text-headline-lg">
              <span>{t("hero.title1")}</span>
              <br />
              <span className="font-medium">{t("hero.title2")}</span>
            </h1>
            <p className="mt-3 max-w-md break-keep text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 sm:mt-4">
              {t("hero.sub")}
            </p>
            <Link href={ctaHref} className={cn(buttonVariants({ variant: "accent", size: "xl" }), "mt-5 sm:mt-7")}>
              {t("hero.cta")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mx-auto w-full min-w-0 max-w-sm lg:max-w-[440px]">
            <MockKpi mock={mock} />
          </div>
        </div>
      </section>

      {ROWS.map(({ key, Figure, aux }, i) => (
        <section key={key} data-section-idx={i + 1} className="border-t border-slate-200 dark:border-slate-800">
          <div className="container grid max-w-5xl gap-6 py-10 sm:gap-8 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-20">
            <div className="min-w-0">
              <h2 className="break-keep text-headline-xs font-bold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-sm lg:text-headline-md">
                {t(`${key}.line1`)}
                <br />
                <span className="font-medium">{t(`${key}.line2`)}</span>
              </h2>
              {aux && (
                <p className="mt-3 max-w-md break-keep text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {t(`${key}.aux`)}
                </p>
              )}
            </div>
            <div className="mx-auto w-full min-w-0 max-w-sm lg:max-w-[440px]">
              <Figure mock={mock} />
            </div>
          </div>
        </section>
      ))}

      <FinalCta ctaHref={ctaHref} authenticated={authenticated} />
    </div>
  );
}

function FinalCta({
  ctaHref,
  authenticated,
}: {
  ctaHref: string;
  authenticated: boolean;
}) {
  const t = useTranslations("qrCampaigns.cta");
  const tRoot = useTranslations("qrCampaigns");
  return (
    <section id="qr-final-cta" className="bg-accent-900 text-white">
      <div className="container max-w-5xl py-20 sm:py-24">
        <h2 className="max-w-2xl text-balance text-headline-md font-bold tracking-headline sm:text-headline-lg">
          {t("title")}
        </h2>
        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href={ctaHref}
            className="focus-ring inline-flex h-12 items-center gap-1.5 rounded-lg bg-white px-6 text-[15px] font-semibold text-accent-900 transition-colors hover:bg-accent-50"
          >
            {t("primary")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          {!authenticated && (
            <Link
              href="/login?next=/campaigns"
              className="focus-ring rounded-sm text-[15px] font-medium text-accent-100 underline decoration-accent-300/50 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
            >
              {t("secondary")}
            </Link>
          )}
        </div>
        <p className="mt-8 text-[13px] text-accent-100/80">{t("note")}</p>
      </div>
      <div className="border-t border-white/10">
        <div className="container max-w-5xl py-4 text-[12px] text-accent-100/80">
          <Link href="/" className="hover:text-white">
            ← {tRoot("backLink")}
          </Link>
          <span className="mx-2">·</span>
          <Link href="/campaigns" className="hover:text-white">
            <BarChart3 className="mr-1 inline-block h-3 w-3" aria-hidden />
            {tRoot("statsLink")}
          </Link>
        </div>
      </div>
    </section>
  );
}
