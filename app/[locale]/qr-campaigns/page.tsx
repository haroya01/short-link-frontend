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
  const mobileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const desktopContainerRef = useRef<HTMLDivElement | null>(null);
  // -1 로 시작해서 첫 frame 직후 0 으로 setter — 좌·우 컬럼 모두 slide-in 으로 부드럽게 진입.
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const t = window.setTimeout(() => setActive(0), 50);
    return () => window.clearTimeout(t);
  }, []);

  // 모바일: 섹션이 viewport 중앙에 가까운지 → active.
  // 모바일에서만 작동. lg+ 에선 mobileRefs 의 노드들이 display:none 이라 observer 가 무발화.
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
          const idx = mobileRefs.current.findIndex((el) => el === best!.target);
          if (idx !== -1) setActive(idx);
        }
      },
      { rootMargin: "-30% 0px -30% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    mobileRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // 데스크탑: 사용자가 컬럼 내부에서 만큼 스크롤했는지를 직접 계산해서 active 산출.
  // 컬럼 height = (SECTION_COUNT + 1) × 100vh, 그 안에 sticky h-screen 한 장이 박혀있음.
  // 좌우 컬럼은 절대 viewport 중앙에 고정되어있고, § 전환은 좌우 slide (translateX) 로만.
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      const c = desktopContainerRef.current;
      if (!c) return;
      if (!window.matchMedia("(min-width: 1024px)").matches) return;
      const rect = c.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.top > vh || rect.bottom < 0) return;
      const scrolledIn = Math.max(0, -rect.top);
      const idx = Math.max(
        0,
        Math.min(SECTION_COUNT - 1, Math.floor(scrolledIn / vh))
      );
      setActive(idx);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(compute);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    compute();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // autoplay: AUTOPLAY_MS 후 다음 §로 smooth scroll. §6 다음은 §1 로 loop.
  // 데스크탑은 desktopContainer 내부의 nextIdx × 100vh 지점으로 직접 scroll,
  // 모바일은 기존 mobile 섹션의 scrollIntoView.
  useEffect(() => {
    if (active < 0) return;
    const timer = window.setTimeout(() => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      const nextIdx = (active + 1) % SECTION_COUNT;
      if (isDesktop) {
        const c = desktopContainerRef.current;
        if (!c) return;
        const rect = c.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const containerTopAbs = rect.top + window.scrollY;
        const target = containerTopAbs + nextIdx * window.innerHeight + 40;
        window.scrollTo({ top: target, behavior: "smooth" });
      } else {
        const current = mobileRefs.current[active];
        if (!current) return;
        const rect = current.getBoundingClientRect();
        const inView = rect.bottom > 0 && rect.top < window.innerHeight;
        if (!inView) return;
        const next = mobileRefs.current[nextIdx];
        if (!next) return;
        // h-[100svh] § 이므로 block:"start" 가 viewport 정확히 채움. scroll-mt-14 가 sticky
        // header 보정. block:"center" 였을 때 § height > viewport 일 경우 observer 가 중간
        // 섹션에 반복 fire 해서 active 가 흔들리며 autoplay 가 멈춘 듯 보이는 회귀.
        next.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [active]);

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
      {/* 모바일 레이아웃 — 각 § 가 viewport 한 화면을 채우되 (min-h-[100svh]) 콘텐츠 비율은
          원래대로. 강제 h-[100svh] + 작은 mock 으로 어색해진 회귀를 되돌림. mock 은 다시 max-w-sm
          (384px). scroll-mt-14 = global sticky header (h-14) 보정. */}
      <div className="lg:hidden">
        {sections.map((s, i) => {
          const isActive = i === active;
          return (
            <div
              key={i}
              ref={(el) => {
                mobileRefs.current[i] = el;
              }}
              data-section-idx={i}
              className="flex min-h-[100svh] flex-col justify-start gap-4 px-6 py-5 scroll-mt-14 sm:gap-7 sm:px-12 sm:py-12"
            >
              {s.kind === "hero" ? (
                <HeroBody s={s} />
              ) : (
                // §2~6 의 mock 시작 Y 를 통일하기 위한 min-h. line1+line2 + (optional aux) 의
                // 최대 자연 높이가 ~100-110px 이므로 120px 으로 천장 잡음. §6 (aux 없음) 은
                // 텍스트 50px + 패딩으로 부족분이 채워짐.
                <div className="min-h-[120px]">
                  <NarrativeBody s={s} isActive={isActive} />
                </div>
              )}
              <div className="mx-auto w-full max-w-sm">
                <s.Mock mock={mock} active={isActive} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 데스크탑 레이아웃 — 좌/우 컬럼이 viewport 정중앙에 sticky 고정.
          § 전환은 opacity fade — 이전 §은 서서히 사라지고 다음 §은 서서히 나타남. */}
      <div
        ref={desktopContainerRef}
        className="relative hidden lg:block"
        style={{ height: `${(SECTION_COUNT + 1) * 100}vh` }}
      >
        <div className="sticky top-0 h-screen">
          <div className="flex h-full">
            <div className="relative w-1/2">
              {sections.map((s, i) => {
                const isActive = i === active;
                return (
                  <div
                    key={i}
                    aria-hidden={!isActive}
                    className="absolute inset-0 flex items-center justify-center p-12"
                    style={{
                      transition: `opacity 700ms ${EASE}`,
                      opacity: isActive ? 1 : 0,
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
                className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2"
              />
            </div>

            <div className="relative w-1/2">
              {sections.map((s, i) => {
                const isActive = i === active;
                return (
                  <div
                    key={i}
                    aria-hidden={!isActive}
                    className="absolute inset-0 flex flex-col justify-center px-16"
                    style={{
                      transition: `opacity 700ms ${EASE}`,
                      opacity: isActive ? 1 : 0,
                      pointerEvents: isActive ? "auto" : "none",
                    }}
                  >
                    {s.kind === "hero" ? (
                      <HeroBody s={s} />
                    ) : (
                      <NarrativeBody s={s} isActive={isActive} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroBody({ s }: { s: HeroSpec }) {
  return (
    <>
      <p className="text-[11px] font-medium uppercase tracking-wider text-accent-700 opacity-0 [animation:hero-fade_700ms_var(--ease)_120ms_forwards]">
        {s.eyebrow}
      </p>
      <h1 className="mt-2 break-keep text-[26px] font-semibold leading-[1.1] tracking-headline text-slate-900 sm:mt-4 sm:text-[36px] sm:leading-[1.15] lg:text-[52px]">
        <span className="inline-block translate-y-4 opacity-0 [animation:hero-rise_900ms_var(--ease)_220ms_forwards]">
          {s.title1}
        </span>
        <br />
        <span className="inline-block translate-y-4 text-accent-700 opacity-0 [animation:hero-rise_900ms_var(--ease)_420ms_forwards]">
          {s.title2}
        </span>
      </h1>
      <p className="mt-2 max-w-md break-keep text-[13px] leading-tight text-slate-500 opacity-0 [animation:hero-fade_700ms_var(--ease)_700ms_forwards] sm:mt-5 sm:text-[15px] sm:leading-relaxed">
        {s.sub}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 sm:mt-6">
        {s.chips.map((chip, ci) => (
          <span
            key={ci}
            className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-700 opacity-0"
            style={{
              animation: `hero-fade 700ms var(--ease) ${850 + ci * 100}ms forwards`,
            }}
          >
            {chip}
          </span>
        ))}
      </div>
    </>
  );
}

function NarrativeBody({ s, isActive }: { s: NarrativeSpec; isActive: boolean }) {
  return (
    <>
      <h2 className="break-keep text-[22px] font-semibold leading-[1.1] tracking-headline text-slate-900 sm:text-[32px] sm:leading-[1.2] lg:text-[40px]">
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
          className="mt-1 break-keep text-[16px] leading-[1.2] tracking-headline text-slate-500 transition-opacity duration-700 sm:mt-3 sm:text-[22px] sm:leading-[1.25] lg:text-[26px]"
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
          className="mt-3 break-keep text-[12px] text-slate-500 transition-opacity duration-700 sm:mt-6 sm:text-[14px]"
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
