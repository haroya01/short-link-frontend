"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { ShortenForm } from "@/components/links/shorten/form";
import { ResultLine } from "@/components/links/shorten/result-line";
import { FeatureCarousel } from "@/components/landing/feature-carousel";
import { HomeCounters } from "@/components/landing/home-counters";
import { HomeStatsExample } from "@/components/landing/home-stats-example";
import { useStageVariant } from "@/lib/stage-flag";
import { usePublicTotals } from "@/lib/api/stats.queries";
import { HomeRecent } from "@/components/links/home-recent";
import { useInvalidateLinks } from "@/lib/api/links.queries";
import { useAuth } from "@/lib/auth";
import { recordRecent, useRecentLinks } from "@/lib/recent-links";
import { extractUrl } from "@/lib/extract-url";
import { Link } from "@/i18n/navigation";
import type { CreateLinkResponse } from "@/types";

// Below-fold sections split into their own chunks (SSR HTML unchanged) so the above-fold form +
// header hydrate without parsing the preview/FAQ code first — on a throttled phone that's the
// difference between the first tap landing instantly or during hydration jank. The feature
// carousel is the one EXCEPTION and stays statically imported (see the import block above): it
// autoplays, so its glyph-warmup layer (feature-carousel.tsx) must request every slide's font
// subsets at first paint — as a lazy chunk those loads slid to chunk-arrival time and the late
// font-face events re-recorded the hero h1 as the LCP mid-measurement. The other sections only
// reveal new glyphs on scroll, and scrolling is a user input that finalizes LCP, so lazy chunks
// are safe there.
const LandingPreviews = dynamic(
  () => import("@/components/landing/landing-previews").then((m) => m.LandingPreviews),
);
const WhyKurl = dynamic(() => import("@/components/landing/why-kurl").then((m) => m.WhyKurl));
const HomeFaq = dynamic(() => import("@/components/landing/home-faq").then((m) => m.HomeFaq));

export default function HomePage() {
  const { authenticated, ready } = useAuth();
  const t = useTranslations("home");
  const locale = useLocale();
  // 무대(Stage)가 기본 랜딩(2026-07-23 졸업). ?stage=off(쿠키/비상 env)로만 레거시 구성이
  // 남아 있다 — 완전 철거 전까지의 안전핀.
  const stage = useStageVariant();
  const headlineSizeClass =
    locale === "ja"
      ? "text-[28px] leading-[1.12] min-[390px]:text-[29px] sm:text-[46px]"
      : locale === "en"
        ? "text-[34px] leading-[1.14] min-[390px]:text-[36px] sm:text-[72px] sm:leading-[1.1]"
        : locale === "vi"
          ? "text-[30px] leading-[1.14] min-[390px]:text-[32px] sm:text-[72px] sm:leading-[1.1]"
          : "text-[38px] leading-[1.14] min-[390px]:text-[40px] sm:text-[72px] sm:leading-[1.1]";
  const [results, setResults] = useState<
    { res: CreateLinkResponse; original: string; passwordRequested?: boolean }[] | null
  >(null);
  /** 답 줄이 자리를 차지한 뒤 "다른 주소도 줄이기"로 빈 줄을 다시 불러온 상태. */
  const [composing, setComposing] = useState(false);
  const tResult = useTranslations("result");
  const recent = useRecentLinks();
  const invalidateLinks = useInvalidateLinks();
  // 다른 앱의 공유 시트 → kurl(설치형 PWA share_target) 로 들어온 주소. 한 번 줄이고 주소창에서 지운다.
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const found = extractUrl(params.get("shared_url") || params.get("shared_text") || "");
    if (!found) return;
    setSharedUrl(found);
    for (const key of ["shared_url", "shared_text", "shared_title"]) params.delete(key);
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
  }, []);
  const { data: totals } = usePublicTotals();
  const showStats = totals != null && (totals.links > 0 || totals.clicks > 0);

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-white dark:bg-slate-950">
        <div className="container relative z-10 max-w-5xl pb-12 pt-14 sm:pb-16 sm:pt-24">
          <div className="mb-9 max-w-3xl space-y-5 sm:mb-11 sm:space-y-6">
            <h1
              data-testid="home-hero-heading"
              className={`text-balance font-bold tracking-[-0.035em] text-slate-900 dark:text-slate-100 ${headlineSizeClass}`}
            >
              <span>
                {t.rich("headline1", {
                  line: (chunks) => <span className="brand-underline">{chunks}</span>,
                })}
              </span>
              <br />
              <span className="font-medium">{t("headline2")}</span>
            </h1>
            <p
              data-testid="home-hero-subhead"
              className="max-w-xl text-pretty text-[15px] leading-[1.65] text-slate-600 dark:text-slate-300 sm:text-[17px]"
            >
              <span className="sm:hidden">{t("mobileSubhead")}</span>
              <span className="hidden sm:inline">{t("subhead")}</span>
            </p>
          </div>

          {/* 제목·입력칸은 등장 모션 없이 첫 페인트에 그대로 — 여러 번 오는 화면이라 매번 다시
              떠오르는 연출은 붙여 넣기까지의 지연일 뿐이다. */}
          <div>
            {/* 단축이 끝나면 입력 칸이 사라지고 그 자리에 답 줄(ResultLine)이 내려앉는다.
                "다른 주소도 줄이기"를 누르면 빈 칸이 맨 위로 돌아오고 답들은
                영수증처럼 아래로 밀린다. */}
            <div className="max-w-2xl">
              {(!results || results.length === 0 || composing) && (
                <ShortenForm
                  hero
                  initialUrl={sharedUrl ?? undefined}
                  heroAutoFocus={Boolean(results && results.length > 0)}
                  authenticated={authenticated}
                  ready={ready}
                  onShortened={(items) => {
                    setComposing(false);
                    // 새 답이 맨 위로 — 이번 세션의 영수증 스택(최대 5줄, 전체는 최근 단축이 보관).
                    setResults((prev) => {
                      const next = items.map((it) => ({
                        res: it.res,
                        original: it.originalUrl,
                        passwordRequested: it.passwordRequested,
                      }));
                      const seen = new Set(next.map((n) => n.res.shortCode));
                      const kept = (prev ?? []).filter((p) => !seen.has(p.res.shortCode));
                      return [...next, ...kept].slice(0, 5);
                    });
                    for (const it of items) {
                      recordRecent({
                        shortCode: it.res.shortCode,
                        shortUrl: it.res.shortUrl,
                        originalUrl: it.originalUrl,
                        createdAt: Date.now(),
                        claimToken: it.res.claimToken,
                      });
                    }
                    if (authenticated) void invalidateLinks();
                  }}
                />
              )}

              {results && results.length > 0 && (
                <div className={composing ? "mt-9 space-y-8" : "space-y-8"}>
                  {results.map((r, i) => (
                    <ResultLine
                      key={r.res.shortCode}
                      result={r.res}
                      originalUrl={r.original}
                      authenticated={authenticated}
                      passwordRequested={r.passwordRequested}
                      enterIndex={i}
                    />
                  ))}
                  {!composing && (
                    <button
                      type="button"
                      onClick={() => setComposing(true)}
                      className="focus-ring result-enter inline-flex items-baseline gap-1.5 rounded-sm text-[14px] font-semibold text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400"
                      style={{ ["--idx" as string]: results.length + 1 } as React.CSSProperties}
                    >
                      {tResult("moreShorten")}
                      <span aria-hidden className="text-[12px] text-slate-300 dark:text-slate-600">
                        ↵
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 min-h-[44px] max-w-2xl">
            {(!results || results.length === 0) && !authenticated && recent.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                {t("anonymousHint")}{" "}
                <Link
                  href="/demo"
                  className="focus-ring inline-flex items-center gap-1 whitespace-nowrap rounded-sm font-medium text-accent-700 underline-offset-4 hover:underline dark:text-accent-400"
                >
                  {t("demoLink")} <ArrowRight aria-hidden className="h-3 w-3" />
                </Link>
              </p>
            ) : null}
          </div>

          <div className="max-w-2xl">
            <HomeRecent exclude={results?.map((r) => r.res.shortCode) ?? []} />
          </div>
        </div>
      </section>

      {/* 글리프 워밍업 — 예시 섹션 제목의 한글 서브셋을 첫 페인트 창에 미리 당긴다.
          늦게 오는 font-face 이벤트가 뷰포트 안 h2 를 LCP 로 재기록하던 것(#710 메커니즘,
          모바일 render delay ~2.9s)의 처방. visibility:hidden 은 폰트 로드를 트리거한다. */}
      {stage === "on" && (
        <div aria-hidden className="invisible absolute h-0 overflow-hidden">
          <span className="text-headline-sm font-bold">{t("stage.title")}</span>
          <span>{t("stage.desc")}</span>
          <span className="font-semibold">{t("stage.feedTitle")}</span>
          <span className="font-semibold">{t("stage.trendTitle")}</span>
        </div>
      )}

      {/* 기본 = 도구 먼저: 폼·최근 링크가 주인공이고, 설명은 로그아웃 방문자에게만 한 섹션.
          ready 전에는 pre-paint 인증 힌트(data-auth-slot)로 로그인 사용자에게 숨겨 둔다.
          ?stage=off = 레거시 구성(롤백 확인용). */}
      {stage === "on" ? (
        !ready ? (
          <div data-auth-slot="anon">
            <HomeStatsExample />
          </div>
        ) : !authenticated ? (
          <HomeStatsExample />
        ) : null
      ) : (
        <LandingPreviews />
      )}

      {/*
       * Counters always render so the layout doesn't shift when usePublicTotals resolves —
       * skeleton placeholders claim the same height as the final value, dropping CLS to ~0.
       */}
      {stage !== "on" && (
        <>
          <Section
            eyebrow={t("statsEyebrow")}
            title={t("statsTitle")}
            subhead={t("statsSubhead")}
          >
            {totals != null && showStats ? (
              <HomeCounters totals={totals} />
            ) : (
              <dl className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800 text-center" aria-hidden>
                {[0, 1].map((i) => (
                  <div key={i} className="px-6 py-2">
                    <div className="mx-auto h-12 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800 sm:h-14" />
                    <div className="mx-auto mt-2 h-3 w-16 rounded bg-slate-50 dark:bg-slate-800/50" />
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
        </>
      )}

      {stage !== "on" && (
        <>
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
        </>
      )}
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
    <section className="bg-white dark:bg-slate-950">
      <div className={"container py-16 sm:py-20 " + (wide ? "max-w-5xl" : "max-w-3xl")}>
        <div className="section-divider mx-auto mb-12 w-full max-w-xl" aria-hidden />
        {hasHeader && (
          <div className="mb-10 space-y-3 text-center sm:mb-14">
            {eyebrow && (
              <p className="text-[13px] font-semibold text-accent-700 dark:text-accent-400">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="text-balance text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-lg">
                {title}
              </h2>
            )}
            {subhead && (
              <p className="mx-auto max-w-md text-balance text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
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
