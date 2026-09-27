"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatsHeroCore } from "@/components/links/stats/hero-panel";
import { LiveClickFeedDemo } from "@/components/links/stats/live-click-feed-demo";
import { Link } from "@/i18n/navigation";
import { buildDemoHeadline } from "@/lib/demo-data";

/**
 * 무대 랜딩 여정 장면 2·3 (vault: kurl-web-stage-design P1 — "잉크 스파인 + 딥그린 클라이맥스").
 * 플래그 on 에서 기존 프리뷰 카드·카운터·기능 캐러셀 섹션을 대체한다. 장면 1(폼→실→알약)은
 * stage-journey.tsx.
 *
 * 장면 2 — 공유: 제품 실물 듀엣(단축 결과 카드 + 실제 LiveClickFeedDemo) — 추상 다이어그램 기각(2026-07-23).
 * 장면 3 — 분석: 풀블리드 딥그린(accent-900) 필드 위에 라이트그린 데이터 드로잉
 *   (스파크라인 자가-드로잉). 랜딩에서 유일한 색 필드.
 *
 * 데이터 드로잉은 전부 장식(aria-hidden) SVG/DOM — 수치는 /demo 와 같은 데모 데이터(lib/demo-data).
 * 스크롤 연동/폴백/reduced-motion 규칙은 globals.css stage-* 블록이 소유(DESIGN.md §11).
 */

const DEMO = buildDemoHeadline();

export function StageScenes() {
  const t = useTranslations("home.stage");
  const tLive = useTranslations("stats.live");

  return (
    <>
      <section className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="container max-w-5xl py-16 sm:py-20">
          <div className="grid items-center gap-10 sm:grid-cols-2 sm:gap-14">
            {/* min-w-0: 그리드 아이템의 기본 min-width 는 auto 라 트랙이 콘텐츠의 min-content 아래로
                못 줄어든다. 아래 원본 URL 은 truncate(=nowrap) 라 min-content 가 449px 로
                잡히고, 그게 1열 트랙을 469px 로 벌려 390 화면 전체를 79px 가로 스크롤시켰다
                (헤더·쿠키바·하단탭이 같이 어긋남). truncate 는 줄일 수 있는 부모가 있어야 동작한다. */}
            <div className="min-w-0 space-y-4">
              <p className="text-[13px] font-semibold text-accent-700 dark:text-accent-400">
                {t("scene2Eyebrow")}
              </p>
              <h2 className="text-balance text-headline-sm font-bold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-lg">
                {t("scene2Title")}
              </h2>
              <p className="max-w-md text-pretty text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 sm:text-[16px]">
                {t("scene2Desc")}
              </p>
              <div aria-hidden className="select-none border-l-2 border-accent-600 py-1 pl-4 dark:border-accent-500">
                <span className="block font-mono text-[17px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  <span className="text-slate-400 dark:text-slate-500">kurl.me/</span>demo01
                </span>
                <span className="mt-1 block truncate text-[13px] text-slate-500 dark:text-slate-400">
                  https://your-very-long-url.com/path?with=query
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <LiveClickFeedDemo />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-accent-900">
        <div className="stage-rise container max-w-5xl py-16 sm:py-24">
          <div className="grid items-center gap-10 sm:grid-cols-2 sm:gap-12">
            <div className="space-y-4">
              <p className="text-[13px] font-semibold text-accent-200">{t("scene3Eyebrow")}</p>
              <h2 className="text-balance text-headline-sm font-bold tracking-headline text-white sm:text-headline-lg">
                {t("scene3Title")}
              </h2>
              <p className="max-w-md text-pretty text-[15px] leading-relaxed text-accent-100/85 sm:text-[16px]">
                {t("scene3Desc")}
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-3">
                <Link
                  href="/demo"
                  className="focus-ring inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-5 text-[15px] font-semibold text-accent-900 transition-colors hover:bg-accent-50"
                >
                  {t("scene3CtaDemo")} <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="focus-ring rounded-sm text-[15px] font-medium text-accent-100 underline decoration-accent-300/50 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
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
                caption={t("scene3Caption", { human: Math.round(DEMO.humanRatio * 100) })}
                total={DEMO.total}
                series={DEMO.series}
                draw="scroll"
                badge={tLive("example")}
                className="border border-accent-300/15 bg-accent-800/40"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
