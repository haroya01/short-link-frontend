"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ShortenForm } from "@/components/links/shorten/form";
import { ResultCard } from "@/components/links/shorten/result-card";
import { FeatureCarousel } from "@/components/landing/feature-carousel";
import { LandingPreviews } from "@/components/landing/landing-previews";
import { WhyKurl } from "@/components/landing/why-kurl";
import { HomeFaq } from "@/components/landing/home-faq";
import { HomeCounters } from "@/components/landing/home-counters";
import { usePublicTotals } from "@/lib/api/stats.queries";
import { RecentLinks } from "@/components/links/recent-links";
import { useAuth } from "@/lib/auth";
import { recordRecent, useRecentLinks } from "@/lib/recent-links";
import { Link, useRouter } from "@/i18n/navigation";
import { useLastArea } from "@/lib/use-last-area";
import type { CreateLinkResponse } from "@/types";

export default function HomePage() {
  const { authenticated, ready } = useAuth();
  const t = useTranslations("home");
  const locale = useLocale();
  const router = useRouter();
  const area = useLastArea();

  // 로그인된 사용자가 `/` 진입 시 마지막 사용 영역으로 자동 복귀.
  // [[decisions/2026-05-29-blog-links-separation-ui]] D1.
  useEffect(() => {
    if (!ready || !authenticated) return;
    router.replace(`/${area}`);
  }, [ready, authenticated, area, router]);
  // headline2 가 ja 에서 「クリックの「いつ・どこから・誰が」を一目で」 23자로 늘어나
  // 기본 sm:text-[60px] 컨테이너 (max-w-3xl) 를 초과해 wrap. ko/en 은 short copy
  // (12/24자) 라 60px 유지 가능 — locale 별로 hero font scale 분기. mobile 도 동일
  // 이유로 ja 만 base 24/26px 으로 축소.
  const headlineSizeClass =
    locale === "ja"
      ? "text-[32px] leading-[1.08] min-[390px]:text-[33px] sm:text-[40px] sm:leading-[1.15] [text-wrap:nowrap] sm:[text-wrap:balance]"
      : "text-[32px] leading-[1.08] min-[390px]:text-[33px] sm:text-[60px] sm:leading-[1.04]";
  const [results, setResults] = useState<
    { res: CreateLinkResponse; original: string }[] | null
  >(null);
  const recent = useRecentLinks();
  const { data: totals } = usePublicTotals();
  const showStats = totals != null && (totals.links > 0 || totals.clicks > 0);

  return (
    <div>
      {/*
       * Hero — flat white surface (no mesh, no noise) so the typography carries the page on its
       * own. The earlier version layered `hero-mesh + hero-noise + grid-bg` over a centered
       * eyebrow / h1 / subhead, and the cumulative ornament read as busy rather than refined.
       * Luxury / refined surfaces work through restraint — type hierarchy + spacing carry the
       * page. Headline is Pretendard semibold across both lines (single family, no display
       * swap) — the contrast between solid slate-900 line one and slate-500 line two is the
       * editorial moment. The hairline eyebrow on either side of the tagline stays as a subtle
       * grid-break, and the cascade-in still fires through `.hero-stagger`, opacity-only.
       */}
      <section className="relative isolate overflow-hidden bg-white">
        <div className="container relative z-10 max-w-3xl py-20 sm:py-28">
          <div className="hero-stagger mb-10 space-y-4 sm:mb-12">
            <div
              className="flex items-center justify-center gap-3 text-center"
              style={{ ["--hi" as string]: 0 } as React.CSSProperties}
            >
              <span aria-hidden className="hidden h-px w-10 bg-accent-300/70 sm:block" />
              <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700">
                {t("tagline")}
              </p>
              <span aria-hidden className="hidden h-px w-10 bg-accent-300/70 sm:block" />
            </div>
            <h1
              data-testid="home-hero-heading"
              className={`text-balance text-center font-semibold tracking-headline text-slate-900 ${headlineSizeClass}`}
              style={{ ["--hi" as string]: 1 } as React.CSSProperties}
            >
              <span className="sm:hidden">
                <span>{t("mobileHeadline1")}</span>
                <br />
                <span className="text-slate-500">{t("mobileHeadline2")}</span>
              </span>
              <span className="hidden sm:inline">
                <span>{t("headline1")}</span>
                <br />
                <span className="text-slate-500">{t("headline2")}</span>
              </span>
            </h1>
            <p
              data-testid="home-hero-subhead"
              className="mx-auto max-w-[320px] text-balance text-center text-[14px] leading-[1.7] text-slate-500 sm:max-w-md sm:text-[15px] sm:leading-relaxed"
              style={{ ["--hi" as string]: 2 } as React.CSSProperties}
            >
              <span className="sm:hidden">{t("mobileSubhead")}</span>
              <span className="hidden sm:inline">{t("subhead")}</span>
            </p>
          </div>

          {/*
           * Form sits outside the hero-stagger wrapper because the staggered cascade in the
           * headline already lasts ~360ms; making the form wait another 90ms past the subhead
           * forces visitors past the "I can already see where to paste my URL" moment. The
           * `profile-fade` keyframe gives it the same fade-in feel without the cascading delay.
           */}
          <div
            className="profile-fade"
            style={{ ["--idx" as string]: 4 } as React.CSSProperties}
          >
            <ShortenForm
              authenticated={authenticated}
              onShortened={(items) => {
                setResults(
                  items.map((it) => ({
                    res: it.res,
                    original: it.originalUrl,
                  })),
                );
                for (const it of items) {
                  recordRecent({
                    shortCode: it.res.shortCode,
                    shortUrl: it.res.shortUrl,
                    originalUrl: it.originalUrl,
                    createdAt: Date.now(),
                    claimToken: it.res.claimToken,
                  });
                }
              }}
            />
          </div>

          <div className="mt-6 min-h-[64px]">
            {results && results.length > 0 ? (
              <div className="space-y-3">
                {results.map((r) => (
                  <ResultCard
                    key={r.res.shortCode}
                    result={r.res}
                    originalUrl={r.original}
                    authenticated={authenticated}
                  />
                ))}
                {!authenticated ? (
                  <Link
                    href="/login"
                    className="group flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3 text-sm text-slate-100 shadow-sm transition hover:bg-slate-800"
                  >
                    <span>
                      {t.rich("loginCta", {
                        clickStats: (chunks: React.ReactNode) => (
                          <span className="font-semibold text-accent-300">{chunks}</span>
                        ),
                      })}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-accent-300 transition group-hover:translate-x-0.5" />
                  </Link>
                ) : (
                  <Link
                    href="/links"
                    className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <span>{t("ctaSeeLinks")}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" />
                  </Link>
                )}
              </div>
            ) : !authenticated ? (
              <div className="space-y-2 text-center">
                <p className="text-xs text-slate-500">{t("anonymousHint")}</p>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-1 text-xs text-accent-700 hover:text-accent-800"
                >
                  {t("demoLink")} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        {/* Scroll cue — animated chevron + label below the fold-anchored hero so first-time
            visitors see that the page continues past the input. The element is `absolute` inside
            the hero, so it scrolls off with the hero itself once the user starts moving — no
            JS to fade it out. `motion-safe:animate-bounce` opts out for prefers-reduced-motion. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-4 hidden flex-col items-center gap-0.5 text-[11px] font-medium text-slate-400 sm:flex"
        >
          <span>{t("scrollHint")}</span>
          <ChevronDown className="h-4 w-4 motion-safe:animate-bounce" />
        </div>
      </section>

      <LandingPreviews />

      {!authenticated && recent.length > 0 && (
        <Section eyebrow={t("recentEyebrow")} title={t("recentTitle")} subhead={t("recentSubhead")}>
          <RecentLinks />
        </Section>
      )}

      {/*
       * Counters always render so the layout doesn't shift when usePublicTotals resolves —
       * skeleton placeholders claim the same height as the final value, dropping CLS to ~0.
       */}
      <Section
        eyebrow={t("statsEyebrow")}
        title={t("statsTitle")}
        subhead={t("statsSubhead")}
      >
        {totals != null && showStats ? (
          <HomeCounters totals={totals} />
        ) : (
          <dl className="grid grid-cols-2 divide-x divide-slate-100 text-center" aria-hidden>
            {[0, 1].map((i) => (
              <div key={i} className="px-6 py-2">
                <div className="mx-auto h-12 w-24 animate-pulse rounded bg-slate-100 sm:h-14" />
                <div className="mx-auto mt-2 h-3 w-16 rounded bg-slate-50" />
              </div>
            ))}
          </dl>
        )}
      </Section>

      <Section
        wide
        eyebrow={t("featuresEyebrow")}
        title={t("featuresTitle")}
        subhead={t("featuresSubhead")}
      >
        <FeatureCarousel />
      </Section>

      <Section
        wide
        eyebrow={t("whyEyebrow")}
        title={t("whyTitle")}
        subhead={t("whySubhead")}
      >
        <WhyKurl />
      </Section>

      <Section>
        <HomeFaq />
      </Section>
    </div>
  );
}

/*
 * Section primitive — earlier version stacked a centered eyebrow / h2 / subhead on every block.
 * Now each section opens with the shared `.section-divider` (hairline + accent dot) so the
 * transition between blocks reads as a deliberate page break, then the eyebrow / title use the
 * same Pretendard semibold + `.tracking-headline` (−0.025em) as the hero. Single sans family
 * across the app, no display-serif swap — weight and tracking carry the editorial moment.
 */
function Section({
  children,
  eyebrow,
  title,
  subhead,
  wide,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  subhead?: string;
  wide?: boolean;
}) {
  const hasHeader = eyebrow || title || subhead;
  return (
    <section className="bg-white">
      <div className={"container py-16 sm:py-20 " + (wide ? "max-w-5xl" : "max-w-3xl")}>
        <div className="section-divider mx-auto mb-12 w-full max-w-xl" aria-hidden />
        {hasHeader && (
          <div className="mb-10 space-y-3 text-center sm:mb-14">
            {eyebrow && (
              <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="text-balance text-[26px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[34px]">
                {title}
              </h2>
            )}
            {subhead && (
              <p className="mx-auto max-w-md text-balance text-[14px] leading-relaxed text-slate-500">
                {subhead}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
