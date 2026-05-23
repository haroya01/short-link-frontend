"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, BarChart3, QrCode } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  AUTOPLAY_MS,
  EASE,
  MOCK_BY_LOCALE,
  SECTION_COUNT,
  type MockData,
} from "./_lib/mock-data";
import {
  MockBars,
  MockBatch,
  MockCases,
  MockKpi,
  MockPoster,
  MockTimeline,
} from "./_components/mocks";

export default function QrCampaignsLandingPage() {
  const { authenticated } = useAuth();
  // 로그인 안 했어도 클릭 의도는 "캠페인 만들기". 로그인 후 dashboard 가 아니라 /campaigns/new
  // 로 이어지게 ?next= 부착 (ALLOWED_NEXT_PATHS 화이트리스트에 추가됨).
  const ctaHref = authenticated ? "/campaigns/new" : "/login?next=/campaigns/new";
  const locale = useLocale();
  const mock = MOCK_BY_LOCALE[locale] ?? MOCK_BY_LOCALE.en;

  return (
    <div className="bg-white">
      <StickyNarrative mock={mock} />
      <FinalCta ctaHref={ctaHref} authenticated={authenticated} />
      <FloatingCta ctaHref={ctaHref} />
    </div>
  );
}

function FloatingCta({ ctaHref }: { ctaHref: string }) {
  const t = useTranslations("qrCampaigns.hero");
  // 어떤 § 에 있든 우하단 같은 자리. mount 직후 살짝 delay 후 fade-in.
  return (
    <div className="fixed bottom-6 right-6 z-50 opacity-0 [animation:hero-fade_600ms_var(--ease)_800ms_forwards] sm:bottom-8 sm:right-8">
      <Link href={ctaHref}>
        <Button
          variant="accent"
          size="xl"
          className="font-medium shadow-[0_10px_28px_rgba(5,150,105,0.32)]"
        >
          {t("cta")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </Link>
    </div>
  );
}

type MockComponent = React.ComponentType<{ mock: MockData; active: boolean }>;

type HeroSpec = {
  kind: "hero";
  eyebrow: string;
  title1: string;
  title2: string;
  sub: string;
  chips: [string, string, string];
  Mock: MockComponent;
};
type NarrativeSpec = {
  kind: "narrative";
  line1: string;
  line2: string;
  line3?: string;
  aux?: string;
  Mock: MockComponent;
};
type SectionSpec = HeroSpec | NarrativeSpec;

function StickyNarrative({ mock }: { mock: MockData }) {
  const t = useTranslations("qrCampaigns");
  const tHero = useTranslations("qrCampaigns.hero");
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  // -1 로 시작해서 첫 frame 직후 0 으로 setter — 좌측 mock 도 transition 으로 부드럽게 진입.
  const [active, setActive] = useState(-1);

  // 초기 mount 50ms 후 active=0 — fade-in transition 발화
  useEffect(() => {
    const t = window.setTimeout(() => setActive(0), 50);
    return () => window.clearTimeout(t);
  }, []);

  // 어느 섹션이 viewport 중앙에 가까운지 → active index. user 가 manual scroll 해도 active 가
  // 따라가고, 그 시점부터 다음 7s timer 가 reset (아래 autoplay useEffect 의 deps 가 active).
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!best || entry.intersectionRatio > best.intersectionRatio) {
              best = entry;
            }
          }
        }
        if (best) {
          const idx = sectionRefs.current.findIndex((el) => el === best!.target);
          if (idx !== -1) setActive(idx);
        }
      },
      { rootMargin: "-30% 0px -30% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // autoplay: AUTOPLAY_MS 후 다음 섹션으로 smooth scroll. §6 다음은 §1 로 loop (사용자 요청).
  // inView 가드 — 현재 active 섹션이 viewport 에서 사라졌으면 (e.g. 사용자가 FinalCta 까지 스크롤
  // 다운) 자동 루프로 다시 위로 끌어오지 않음. paused 트리거 대용.
  useEffect(() => {
    if (active < 0) return;
    const timer = window.setTimeout(() => {
      const current = sectionRefs.current[active];
      if (!current) return;
      const rect = current.getBoundingClientRect();
      const inView = rect.bottom > 0 && rect.top < window.innerHeight;
      if (!inView) return;
      const nextIdx = (active + 1) % SECTION_COUNT;
      const next = sectionRefs.current[nextIdx];
      if (!next) return;
      next.scrollIntoView({ behavior: "smooth", block: "center" });
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [active]);

  // §1 자리에 Hero (브랜드 명제 + 페인 sub + CTA) 를 통합. 진입 즉시 좌측 KPI mock + 우측 Hero text
  // 가 한 viewport 에 같이 보임 — user 가 첫 화면에서 페이지 정체성과 autoplay 진행을 동시에 인식.
  const sections: SectionSpec[] = [
    {
      kind: "hero",
      eyebrow: tHero("eyebrow"),
      title1: tHero("title1"),
      title2: tHero("title2"),
      sub: tHero("sub"),
      chips: [tHero("chip1"), tHero("chip2"), tHero("chip3")],
      Mock: MockKpi,
    },
    {
      kind: "narrative",
      line1: t("s2.line1"),
      line2: t("s2.line2"),
      aux: t("s2.aux"),
      Mock: MockBatch,
    },
    {
      kind: "narrative",
      line1: t("s3.line1"),
      line2: t("s3.line2"),
      aux: t("s3.aux"),
      Mock: MockPoster,
    },
    {
      kind: "narrative",
      line1: t("s4.line1"),
      line2: t("s4.line2"),
      aux: t("s4.aux"),
      Mock: MockBars,
    },
    {
      kind: "narrative",
      line1: t("s5.line1"),
      line2: t("s5.line2"),
      aux: t("s5.aux"),
      Mock: MockCases,
    },
    {
      kind: "narrative",
      line1: t("s6.line1"),
      line2: t("s6.line2"),
      Mock: MockTimeline,
    },
  ];

  return (
    <section className="relative bg-slate-50/40">
      {/* 모바일 전용 sticky progress chip — 어느 §에 있는지 + 다음 전환까지 countdown.
          데스크탑은 left sticky 컬럼 안의 ProgressDots 가 같은 역할.
          글로벌 header (h-14, z-50) 바로 아래에 붙임. */}
      <div className="pointer-events-none sticky top-16 z-20 flex justify-center px-4 lg:hidden">
        <ProgressDots
          count={SECTION_COUNT}
          active={active}
          className="rounded-full bg-white/85 px-2.5 py-1.5 shadow-sm backdrop-blur"
        />
      </div>
      <div className="lg:flex">
        <div className="relative hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:w-1/2 lg:items-center lg:justify-center">
          {sections.map((s, i) => {
            const isActive = i === active;
            return (
              <div
                key={i}
                aria-hidden={!isActive}
                className="absolute inset-0 flex items-center justify-center p-12 transition-all duration-[700ms]"
                style={{
                  transitionTimingFunction: EASE,
                  opacity: isActive ? 1 : 0,
                  transform: isActive
                    ? "scale(1) translateY(0)"
                    : "scale(0.96) translateY(8px)",
                  pointerEvents: isActive ? "auto" : "none",
                }}
              >
                <div className="w-full max-w-[440px]">
                  <s.Mock mock={mock} active={isActive} />
                </div>
              </div>
            );
          })}
          <ProgressDots
            count={SECTION_COUNT}
            active={active}
            className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2"
          />
        </div>

        <div className="lg:w-1/2">
          {sections.map((s, i) => {
            const isActive = i === active;
            return (
              <div
                key={i}
                ref={(el) => {
                  sectionRefs.current[i] = el;
                }}
                data-section-idx={i}
                className="flex flex-col justify-center px-6 py-12 sm:px-12 sm:py-16 lg:min-h-screen lg:px-16 lg:py-0"
              >
                {s.kind === "hero" ? (
                  <>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-accent-700 opacity-0 [animation:hero-fade_700ms_var(--ease)_120ms_forwards]">
                      {s.eyebrow}
                    </p>
                    <h1 className="mt-4 break-keep text-[26px] font-semibold leading-[1.15] tracking-headline text-slate-900 sm:text-[36px] lg:text-[52px]">
                      <span className="inline-block translate-y-4 opacity-0 [animation:hero-rise_900ms_var(--ease)_220ms_forwards]">
                        {s.title1}
                      </span>
                      <br />
                      <span className="inline-block translate-y-4 text-accent-700 opacity-0 [animation:hero-rise_900ms_var(--ease)_420ms_forwards]">
                        {s.title2}
                      </span>
                    </h1>
                    <p className="mt-5 max-w-md break-keep text-[13px] leading-relaxed text-slate-500 opacity-0 [animation:hero-fade_700ms_var(--ease)_700ms_forwards] sm:text-[15px]">
                      {s.sub}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {s.chips.map((chip, ci) => (
                        <span
                          key={ci}
                          className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-700 opacity-0"
                          style={{
                            animation: `hero-fade 700ms var(--ease) ${
                              850 + ci * 100
                            }ms forwards`,
                          }}
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="break-keep text-[22px] font-semibold leading-[1.2] tracking-headline text-slate-900 sm:text-[32px] lg:text-[40px]">
                      <span
                        className="inline-block transition-opacity duration-700"
                        style={{
                          transitionTimingFunction: EASE,
                          opacity: isActive ? 1 : 0,
                        }}
                      >
                        {s.line1}
                      </span>
                      <br />
                      <span
                        className="inline-block text-slate-500 transition-opacity duration-700"
                        style={{
                          transitionTimingFunction: EASE,
                          transitionDelay: isActive ? "180ms" : "0ms",
                          opacity: isActive ? 1 : 0,
                        }}
                      >
                        {s.line2}
                      </span>
                    </h2>
                    {s.line3 && (
                      <p
                        className="mt-3 break-keep text-[16px] leading-[1.25] tracking-headline text-slate-500 transition-opacity duration-700 sm:text-[22px] lg:text-[26px]"
                        style={{
                          transitionTimingFunction: EASE,
                          transitionDelay: isActive ? "340ms" : "0ms",
                          opacity: isActive ? 1 : 0,
                        }}
                      >
                        {s.line3}
                      </p>
                    )}
                    {s.aux && (
                      <p
                        className="mt-6 break-keep text-[12px] text-slate-500 transition-opacity duration-700 sm:text-[14px]"
                        style={{
                          transitionTimingFunction: EASE,
                          transitionDelay: isActive ? "500ms" : "0ms",
                          opacity: isActive ? 1 : 0,
                        }}
                      >
                        ── {s.aux}
                      </p>
                    )}
                  </>
                )}
                <div className="mx-auto mt-8 w-full max-w-sm lg:hidden">
                  <s.Mock mock={mock} active={isActive} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProgressDots({
  count,
  active,
  className = "",
}: {
  count: number;
  active: number;
  className?: string;
}) {
  return (
    <div className={"flex gap-2 " + className}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative h-1.5 w-10 overflow-hidden rounded-full bg-slate-200"
        >
          {i < active && <div className="absolute inset-0 bg-accent-400" />}
          {i === active && (
            <div
              key={`bar-${active}`}
              className="absolute inset-0 origin-left bg-accent-600"
              style={{ animation: `dot-progress ${AUTOPLAY_MS}ms linear forwards` }}
            />
          )}
        </div>
      ))}
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
    <section className="bg-slate-900 text-white">
      <div className="container max-w-5xl py-24 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent-600">
          <QrCode className="h-6 w-6" aria-hidden />
        </div>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-tagline text-accent-400">
          {t("eyebrow")}
        </p>
        <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-headline sm:text-[44px]">
          {t("title")}
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href={ctaHref}>
            <Button
              variant="accent"
              className="h-14 rounded-xl px-10 text-[15px] font-semibold shadow-[0_10px_28px_rgba(5,150,105,0.35)]"
            >
              {t("primary")}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Button>
          </Link>
          {!authenticated && (
            <Link href="/login?next=/campaigns">
              <Button
                variant="ghost"
                size="xl"
                className="px-6 text-[13px] font-medium text-white hover:bg-white/10"
              >
                {t("secondary")}
              </Button>
            </Link>
          )}
        </div>
        <p className="mt-8 text-[12px] text-slate-400">{t("note")}</p>
      </div>
      <div className="border-t border-white/10">
        <div className="container max-w-5xl py-4 text-center text-[11px] text-slate-400">
          <Link href="/" className="hover:text-white">
            ← {tRoot("backLink")}
          </Link>
          <span className="mx-2">·</span>
          <Link href="/qr-campaigns" className="hover:text-white">
            <BarChart3 className="mr-1 inline-block h-3 w-3" aria-hidden />
            {tRoot("statsLink")}
          </Link>
        </div>
      </div>
    </section>
  );
}
