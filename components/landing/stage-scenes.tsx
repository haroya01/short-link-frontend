"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatsHeroCore } from "@/components/links/stats/hero-panel";
import { LiveClickFeedDemo } from "@/components/links/stats/live-click-feed-demo";
import { Link } from "@/i18n/navigation";

/**
 * 무대 랜딩 여정 장면 2·3 (vault: kurl-web-stage-design P1 — "잉크 스파인 + 딥그린 클라이맥스").
 * 플래그 on 에서 기존 프리뷰 카드·카운터·기능 캐러셀 섹션을 대체한다. 장면 1(폼→실→알약)은
 * stage-journey.tsx.
 *
 * 장면 2 — 공유: 제품 실물 듀엣(단축 결과 카드 + 실제 LiveClickFeedDemo) — 추상 다이어그램 기각(2026-07-23).
 * 장면 3 — 분석 클라이맥스: 풀블리드 딥그린(accent-900) 필드 위에 라이트그린 데이터 드로잉
 *   (스파크라인 자가-드로잉·주간 막대 상승). kurl 의 "검정 무대"에 해당하는 유일한 색 필드.
 *
 * 데이터 드로잉은 전부 장식(aria-hidden) SVG/DOM — 수치·칩 라벨은 로케일 무관 데모 리터럴.
 * 스크롤 연동/폴백/reduced-motion 규칙은 globals.css stage-* 블록이 소유(AGENTS §11).
 */

// 장면 3 데모 시계열 — 실제 StatsHeroCore 가 그대로 그린다(우상향 11포인트).
const DEMO_SERIES = [12, 20, 17, 32, 28, 46, 41, 62, 58, 84, 96];

export function StageScenes() {
  const t = useTranslations("home.stage");

  return (
    <>
      {/* ── 장면 2: 공유 → 클릭 회귀 — 추상 다이어그램 대신 제품 실물 듀엣.
          왼쪽 = 카피 + 단축 결과 카드(장식 데모), 오른쪽 = 실제 통계 화면의 LiveClickFeedDemo
          컴포넌트 그대로(랜딩이 보여주는 것 = 실존 화면, StatsHeroCore 와 같은 계약). */}
      <section className="bg-white dark:bg-slate-950">
        <div className="container max-w-5xl pb-10 pt-16 sm:pb-14 sm:pt-24">
          <div className="grid items-center gap-10 sm:grid-cols-2 sm:gap-14">
            <div className="space-y-4">
              <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700 dark:text-accent-400">
                {t("scene2Eyebrow")}
              </p>
              <h2 className="text-balance text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-lg">
                {t("scene2Title")}
              </h2>
              <p className="max-w-md text-balance text-[14px] leading-relaxed text-slate-500 dark:text-slate-400 sm:text-[15px]">
                {t("scene2Desc")}
              </p>
              <div
                aria-hidden
                className="select-none rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_44px_-24px_rgba(5,150,105,0.4)] dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-mono text-[16px] font-bold tracking-tight text-accent-700 dark:text-accent-400">
                      kurl.me/demo01
                    </span>
                    <span className="mt-1 block truncate font-mono text-[11px] text-slate-400 dark:text-slate-500">
                      https://your-very-long-url.com/path?with=query
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-tagline text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      copy
                    </span>
                    <span className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-tagline text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      qr
                    </span>
                  </span>
                </div>
              </div>
            </div>
            {/* 실제 통계 화면의 라이브 피드가 그대로 — 행이 3.2초마다 실제로 도착한다 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_56px_-28px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-900">
              <LiveClickFeedDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ── 장면 3: 분석 클라이맥스 — 딥그린 필드 ─────────────────── */}
      <section className="bg-white dark:bg-slate-950">
        {/* 스파인이 필드로 스며드는 이음새 */}
        <div aria-hidden className="mx-auto h-14 w-[2px] rounded-full bg-gradient-to-b from-accent-600 to-accent-800 sm:h-20" />
        <div className="stage-rise bg-accent-900 sm:mx-4 sm:rounded-[40px] xl:mx-8">
          <div className="container max-w-5xl py-16 sm:py-24">
            <div className="grid items-center gap-10 sm:grid-cols-2 sm:gap-12">
              <div className="space-y-4">
                <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-300">
                  {t("scene3Eyebrow")}
                </p>
                <h2 className="text-balance text-headline-sm font-semibold tracking-headline text-white sm:text-headline-lg">
                  {t("scene3Title")}
                </h2>
                <p className="max-w-md text-balance text-[14px] leading-relaxed text-accent-100/80 sm:text-[15px]">
                  {t("scene3Desc")}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href="/demo"
                    className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-accent-900 transition hover:bg-accent-50"
                  >
                    {t("scene3CtaDemo")} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="focus-ring inline-flex items-center rounded-lg border border-accent-300/40 px-4 py-2.5 text-sm text-accent-100 transition hover:border-accent-300/70 hover:text-white"
                  >
                    {t("scene3CtaStart")}
                  </Link>
                </div>
              </div>

              {/* 통계 히어로 패널 — 실제 통계 화면(StatsCards 히어로)과 동일한 StatsHeroCore.
                  랜딩이 보여주는 카드 = 제품에 실존하는 카드 (과장광고 방지 계약). */}
              <div aria-hidden className="select-none">
                <StatsHeroCore
                  label={t("scene3Eyebrow")}
                  caption="30d · human 92%"
                  total={1247}
                  series={DEMO_SERIES}
                  draw="scroll"
                  className="border border-accent-300/15 bg-accent-800/40"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
