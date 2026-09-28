"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, BarChart3 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
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
  const [pastHero, setPastHero] = useState(false);
  const onActiveChange = useCallback((idx: number) => setPastHero(idx > 0), []);

  return (
    <div className="bg-white dark:bg-slate-950">
      <StickyNarrative mock={mock} ctaHref={ctaHref} onActiveChange={onActiveChange} />
      <FinalCta ctaHref={ctaHref} authenticated={authenticated} />
      <FloatingCta ctaHref={ctaHref} pastHero={pastHero} />
    </div>
  );
}

function FloatingCta({ ctaHref, pastHero }: { ctaHref: string; pastHero: boolean }) {
  const t = useTranslations("qrCampaigns.hero");
  // 마지막 CTA 띠나 푸터가 보이면 물러난다 — 띠에는 같은 버튼이 있고, 푸터에선 우하단 링크 줄
  // (GitHub·개인정보처리방침) 위에 앉아 클릭을 먹었다.
  const [atFooter, setAtFooter] = useState(false);
  useEffect(() => {
    const targets = [document.getElementById("qr-final-cta"), document.querySelector("footer")].filter(
      (el): el is HTMLElement => el != null,
    );
    if (targets.length === 0 || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        setAtFooter(visible.size > 0);
      },
      { rootMargin: "0px 0px -8px 0px" },
    );
    for (const el of targets) io.observe(el);
    return () => io.disconnect();
  }, []);

  const shown = pastHero && !atFooter;

  return (
    // bottom 은 --fab-bottom(globals) — 쿠키 배너가 떠 있으면 그 높이만큼 위로 올라간다. 고정 offset
    // 이던 시절엔 이 버튼이 배너의 '확인' 버튼을 덮어, 이 페이지에선 배너를 닫을 수가 없었다.
    <div
      aria-hidden={!shown}
      className={cn(
        "fixed bottom-[var(--fab-bottom,1.5rem)] right-8 z-50 hidden transition-[opacity,transform] duration-200 ease-[var(--ease)] motion-reduce:transition-none lg:block",
        shown ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <Link
        href={ctaHref}
        tabIndex={shown ? undefined : -1}
        className={buttonVariants({ variant: "accent", size: "xl" })}
      >
        {t("cta")}
        <ArrowRight className="h-4 w-4" aria-hidden />
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
  chipsShort: [string, string, string];
  cta: string;
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

function StickyNarrative({
  mock,
  ctaHref,
  onActiveChange,
}: {
  mock: MockData;
  ctaHref: string;
  onActiveChange: (idx: number) => void;
}) {
  const t = useTranslations("qrCampaigns");
  const tHero = useTranslations("qrCampaigns.hero");
  const mobileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const desktopContainerRef = useRef<HTMLDivElement | null>(null);
  // -1 로 시작해서 첫 frame 직후 0 으로 setter — 좌·우 컬럼 모두 slide-in 으로 부드럽게 진입.
  const [active, setActive] = useState(-1);

  useEffect(() => onActiveChange(active), [active, onActiveChange]);

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
  // 좌우 컬럼은 절대 viewport 중앙에 고정되어있고, § 전환은 opacity fade 로.
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

  const sections: SectionSpec[] = [
    {
      kind: "hero",
      eyebrow: tHero("eyebrow"),
      title1: tHero("title1"),
      title2: tHero("title2"),
      sub: tHero("sub"),
      chips: [tHero("chip1"), tHero("chip2"), tHero("chip3")],
      chipsShort: [tHero("chip1Short"), tHero("chip2Short"), tHero("chip3Short")],
      cta: tHero("cta"),
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
    <section className="relative bg-slate-50/40 dark:bg-slate-900/40">
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
                <HeroBody s={s} ctaHref={ctaHref} interactive />
              ) : (
                // §2-6 의 mock 시작 Y 통일용 min-h + 텍스트를 약간 아래로 (mt-8).
                // Hero (§1) 와 시각적 시작점을 다르게 줘서 narrative 가 "내려앉아" 보이도록.
                <div className="mt-8 min-h-[120px]">
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
          {/* 좌(목업)·우(설명) 한 쌍을 가운데로 묶는 상한. 예전엔 두 칸이 각각 뷰포트의 절반이라
              2560 같은 초광폭에선 목업과 설명이 서로 멀어지고 오른쪽에 큰 공백이 남아, 설명 글이
              화면 왼쪽으로 밀려 보였다(신고). 무대 폭을 사이트 컨테이너(1280)와 맞춰, 넓은 화면에서도 헤더·본문과 같은 축에 선다. */}
          <div className="mx-auto flex h-full w-full max-w-[1280px]">
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
                      <HeroBody s={s} ctaHref={ctaHref} interactive={isActive} />
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

// 칩 3개의 stagger 진입 (delay 850/950/1050ms). Tailwind JIT 는 정적 문자열만 컴파일하므로
// delay 별 클래스를 배열로 고정 — 인라인 style 이었을 땐 motion-reduce 로 끌 수 없었다.
const CHIP_ANIMATION = [
  "[animation:hero-fade_700ms_var(--ease)_850ms_forwards]",
  "[animation:hero-fade_700ms_var(--ease)_950ms_forwards]",
  "[animation:hero-fade_700ms_var(--ease)_1050ms_forwards]",
] as const;

function HeroBody({ s, ctaHref, interactive }: { s: HeroSpec; ctaHref: string; interactive: boolean }) {
  return (
    <>
      <p className="text-[13px] font-semibold text-accent-700 dark:text-accent-400 opacity-0 [animation:hero-fade_700ms_var(--ease)_120ms_forwards] motion-reduce:[animation:none] motion-reduce:opacity-100">
        {s.eyebrow}
      </p>
      <h1 className="mt-2 break-keep text-headline-sm font-bold tracking-headline text-slate-900 dark:text-slate-100 sm:mt-4 sm:text-headline-md lg:text-headline-xl">
        <span className="inline-block translate-y-4 opacity-0 [animation:hero-rise_900ms_var(--ease)_220ms_forwards] motion-reduce:[animation:none] motion-reduce:translate-y-0 motion-reduce:opacity-100">
          {s.title1}
        </span>
        <br />
        <span className="inline-block translate-y-4 font-medium opacity-0 [animation:hero-rise_900ms_var(--ease)_420ms_forwards] motion-reduce:[animation:none] motion-reduce:translate-y-0 motion-reduce:opacity-100">
          {s.title2}
        </span>
      </h1>
      <p className="mt-2 max-w-md break-keep text-[13px] leading-tight text-slate-500 dark:text-slate-400 opacity-0 [animation:hero-fade_700ms_var(--ease)_700ms_forwards] motion-reduce:[animation:none] motion-reduce:opacity-100 sm:mt-5 sm:text-[15px] sm:leading-relaxed">
        {s.sub}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 sm:mt-6">
        {s.chips.map((chip, ci) => (
          <span
            key={ci}
            className={`inline-flex items-center whitespace-nowrap rounded-md border border-slate-200 px-2.5 py-1 text-[12px] font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300 opacity-0 ${CHIP_ANIMATION[ci]} motion-reduce:[animation:none] motion-reduce:opacity-100`}
          >
            <span className="sm:hidden">{s.chipsShort[ci]}</span>
            <span className="hidden sm:inline">{chip}</span>
          </span>
        ))}
      </div>
      <div className="mt-1 opacity-0 [animation:hero-fade_700ms_var(--ease)_900ms_forwards] motion-reduce:[animation:none] motion-reduce:opacity-100 sm:mt-6 lg:mt-8">
        <Link
          href={ctaHref}
          tabIndex={interactive ? undefined : -1}
          className={buttonVariants({ variant: "accent", size: "xl" })}
        >
          {s.cta}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </>
  );
}

function NarrativeBody({ s, isActive }: { s: NarrativeSpec; isActive: boolean }) {
  return (
    <>
      <h2 className="break-keep text-headline-xs font-bold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md lg:text-headline-lg">
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
          className="inline-block font-medium transition-opacity duration-700"
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
          className="mt-1 break-keep text-[16px] leading-[1.2] tracking-headline text-slate-500 dark:text-slate-400 transition-opacity duration-700 sm:mt-3 sm:text-[22px] sm:leading-[1.25] lg:text-[26px]"
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
          className="mt-3 break-keep text-[12px] text-slate-500 dark:text-slate-400 transition-opacity duration-700 sm:mt-6 sm:text-[14px]"
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
        <p className="text-[13px] font-semibold text-accent-200">{t("eyebrow")}</p>
        <h2 className="mt-3 max-w-2xl text-balance text-headline-md font-bold tracking-headline sm:text-headline-lg">
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
