"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * 무대 랜딩 여정 장면 2·3 (vault: kurl-web-stage-design P1 — "잉크 스파인 + 딥그린 클라이맥스").
 * 플래그 on 에서 기존 프리뷰 카드·카운터·기능 캐러셀 섹션을 대체한다. 장면 1(폼→실→알약)은
 * stage-journey.tsx.
 *
 * 장면 2 — 공유: 리퍼러 칩(종이)들이 가로 실로 중앙 스파인에 합류, 접점마다 클릭 맥박.
 * 장면 3 — 분석 클라이맥스: 풀블리드 딥그린(accent-900) 필드 위에 라이트그린 데이터 드로잉
 *   (스파크라인 자가-드로잉·주간 막대 상승). kurl 의 "검정 무대"에 해당하는 유일한 색 필드.
 *
 * 데이터 드로잉은 전부 장식(aria-hidden) SVG/DOM — 수치·칩 라벨은 로케일 무관 데모 리터럴.
 * 스크롤 연동/폴백/reduced-motion 규칙은 globals.css stage-* 블록이 소유(AGENTS §11).
 */

const REFERRER_CHIPS = [
  { label: "instagram bio", side: "left", top: "8%" },
  { label: "x.com", side: "right", top: "30%" },
  { label: "youtube", side: "left", top: "54%" },
  { label: "newsletter", side: "right", top: "76%" },
] as const;

export function StageScenes() {
  const t = useTranslations("home.stage");

  return (
    <>
      {/* ── 장면 2: 공유 → 클릭 합류 ─────────────────────────────── */}
      <section className="bg-white dark:bg-slate-950">
        <div className="container max-w-3xl pb-8 pt-16 sm:pb-10 sm:pt-20">
          <div className="mb-10 space-y-3 text-center sm:mb-12">
            <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700 dark:text-accent-400">
              {t("scene2Eyebrow")}
            </p>
            <h2 className="text-balance text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-lg">
              {t("scene2Title")}
            </h2>
            <p className="mx-auto max-w-md text-balance text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
              {t("scene2Desc")}
            </p>
          </div>

          {/* 합류 다이어그램 — sm+: 스파인 좌우에서 칩이 실을 타고 합류. <sm: 칩 2×2 + 짧은 스파인 */}
          <div aria-hidden className="relative mx-auto hidden h-[340px] max-w-xl sm:block">
            <div className="stage-thread absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rounded-full bg-gradient-to-b from-accent-300/40 via-accent-500/70 to-accent-600" />
            {/* 각 행은 컨테이너 가장자리~중앙 스파인까지 절대 스팬 — 연결선이 flex-1 로 스파인에
                실제로 닿고, 접점 위에서 클릭 맥박이 뛴다("합류"가 구도의 요점). */}
            {REFERRER_CHIPS.map((chip) => (
              <div
                key={chip.label}
                className={
                  "absolute flex items-center " +
                  (chip.side === "left"
                    ? "left-[4%] right-[calc(50%-4px)] flex-row"
                    : "left-[calc(50%-4px)] right-[4%] flex-row-reverse")
                }
                style={{ top: chip.top }}
              >
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-[12px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {chip.label}
                </span>
                <span
                  className={
                    "stage-thread-x h-px flex-1 bg-accent-300/70 " +
                    (chip.side === "right" ? "stage-from-right" : "")
                  }
                />
                <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                  <span className="stage-pulse-ring absolute inline-flex h-full w-full rounded-full bg-accent-500 motion-reduce:hidden" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-600" />
                </span>
              </div>
            ))}
          </div>
          <div aria-hidden className="flex flex-wrap items-center justify-center gap-2 sm:hidden">
            {REFERRER_CHIPS.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-accent-600" />
                {chip.label}
              </span>
            ))}
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

              {/* 데이터 드로잉 패널 — 스파크라인이 스스로 그려지고 주간 막대가 차오른다 */}
              <div aria-hidden className="select-none">
                <div className="rounded-2xl border border-accent-300/15 bg-accent-800/40 p-5 sm:p-6">
                  <div className="mb-4 flex items-baseline justify-between font-mono">
                    <span className="text-[22px] font-semibold tracking-tight text-white">1,247</span>
                    <span className="text-[11px] uppercase tracking-tagline text-accent-300/80">
                      30d &middot; human 92%
                    </span>
                  </div>
                  <svg viewBox="0 0 320 96" fill="none" className="w-full">
                    <path
                      d="M4 84 L36 76 L68 79 L100 64 L132 68 L164 52 L196 57 L228 40 L260 44 L292 22 L316 12"
                      pathLength={1}
                      className="stage-draw stroke-accent-300"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="316" cy="12" r="3" className="fill-accent-200" />
                  </svg>
                  <div className="mt-5 flex items-end justify-between gap-1.5">
                    {[34, 52, 40, 66, 48, 88, 72].map((h, i) => (
                      <div
                        key={i}
                        className="stage-bar w-full rounded-sm bg-accent-300/50"
                        style={{ height: `${h * 0.5}px` }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[10px] uppercase text-accent-300/60">
                    <span>mon</span>
                    <span>tue</span>
                    <span>wed</span>
                    <span>thu</span>
                    <span>fri</span>
                    <span>sat</span>
                    <span>sun</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
