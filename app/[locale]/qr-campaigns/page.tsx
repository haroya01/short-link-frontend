"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Check,
  Plus,
  QrCode,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import QRCode from "qrcode";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

type MockRow = { name: string; area: string; dist: string; qty: number };
type MockBar = { label: string; value: number };
type MockCase = {
  biz: string;
  area: string;
  action: string;
  before: number;
  after: number;
  multiplier: string;
};

type MockData = {
  campaignName: string;
  distributedValue: string;
  rows: MockRow[];
  bars: MockBar[];
  reco: string;
  cases: MockCase[];
  startDate: string;
  endDate: string;
};

const MOCK_BY_LOCALE: Record<string, MockData> = {
  ja: {
    campaignName: "2026 春チラシ",
    distributedValue: "10,000",
    rows: [
      { name: "渋谷○丁目 北", area: "渋谷", dist: "業者 A", qty: 1500 },
      { name: "渋谷○丁目 南", area: "渋谷", dist: "業者 A", qty: 1000 },
      { name: "新宿○町", area: "新宿", dist: "業者 B", qty: 2500 },
      { name: "池袋駅前", area: "池袋", dist: "業者 C", qty: 5000 },
    ],
    bars: [
      { label: "渋谷", value: 142 },
      { label: "池袋", value: 91 },
      { label: "新宿", value: 38 },
    ],
    reco: "渋谷 +3,000 / 新宿 -2,000",
    cases: [
      { biz: "ラーメン店 コロネ", area: "渋谷区", action: "1番出口集中", before: 28, after: 142, multiplier: "+5x" },
      { biz: "美容室 アルプス", area: "新宿区", action: "動線変更", before: 47, after: 137, multiplier: "+3x" },
      { biz: "学習塾 ZONE", area: "池袋", action: "週末分析", before: 61, after: 119, multiplier: "+2x" },
    ],
    startDate: "2026-05-25",
    endDate: "2026-05-27",
  },
  ko: {
    campaignName: "2026 봄 전단지",
    distributedValue: "1,000",
    rows: [
      { name: "강남 1출구", area: "강남", dist: "알바 A", qty: 250 },
      { name: "강남 2출구", area: "강남", dist: "알바 A", qty: 250 },
      { name: "신촌 로타리", area: "신촌", dist: "알바 B", qty: 500 },
      { name: "홍대 정문", area: "홍대", dist: "알바 C", qty: 500 },
    ],
    bars: [
      { label: "강남", value: 80 },
      { label: "홍대", value: 47 },
      { label: "신촌", value: 5 },
    ],
    reco: "강남 +750 / 신촌 -250",
    cases: [
      { biz: "라멘집 코로네", area: "강남", action: "1출구 집중", before: 28, after: 142, multiplier: "+5x" },
      { biz: "미용실 알프스", area: "신촌", action: "동선 변경", before: 47, after: 137, multiplier: "+3x" },
      { biz: "학원 ZONE", area: "홍대", action: "주말 분석", before: 61, after: 119, multiplier: "+2x" },
    ],
    startDate: "2026-05-25",
    endDate: "2026-05-27",
  },
  en: {
    campaignName: "2026 Spring drop",
    distributedValue: "10,000",
    rows: [
      { name: "Shibuya N", area: "Shibuya", dist: "Vendor A", qty: 1500 },
      { name: "Shibuya S", area: "Shibuya", dist: "Vendor A", qty: 1000 },
      { name: "Shinjuku", area: "Shinjuku", dist: "Vendor B", qty: 2500 },
      { name: "Ikebukuro", area: "Ikebukuro", dist: "Vendor C", qty: 5000 },
    ],
    bars: [
      { label: "Shibuya", value: 142 },
      { label: "Ikebukuro", value: 91 },
      { label: "Shinjuku", value: 38 },
    ],
    reco: "Shibuya +3,000 / Shinjuku -2,000",
    cases: [
      { biz: "Ramen · Korone", area: "Shibuya", action: "Exit 1 focus", before: 28, after: 142, multiplier: "+5x" },
      { biz: "Salon · Alps", area: "Shinjuku", action: "Reroute foot traffic", before: 47, after: 137, multiplier: "+3x" },
      { biz: "Cram · ZONE", area: "Ikebukuro", action: "Weekend analysis", before: 61, after: 119, multiplier: "+2x" },
    ],
    startDate: "2026-05-25",
    endDate: "2026-05-27",
  },
};

const AUTOPLAY_MS = 4000;
const SECTION_COUNT = 6;
const EASE = "cubic-bezier(0.16,1,0.3,1)";

export default function QrCampaignsLandingPage() {
  const { authenticated } = useAuth();
  const ctaHref = authenticated ? "/campaigns/new" : "/login";
  const locale = useLocale();
  const mock = MOCK_BY_LOCALE[locale] ?? MOCK_BY_LOCALE.en;

  return (
    <div className="bg-white">
      <GlobalStyles />
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
          className="h-12 rounded-xl px-6 text-[14px] font-medium shadow-[0_10px_28px_rgba(5,150,105,0.32)] sm:px-7"
        >
          {t("cta")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </Link>
    </div>
  );
}

function GlobalStyles() {
  return (
    <style jsx global>{`
      :root {
        --ease: ${EASE};
      }
      @keyframes hero-fade {
        to {
          opacity: 1;
        }
      }
      @keyframes hero-rise {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes dot-progress {
        from {
          transform: scaleX(0);
        }
        to {
          transform: scaleX(1);
        }
      }
    `}</style>
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

  // autoplay: 7s 후 다음 섹션으로 smooth scroll (마지막 섹션이면 멈춤). active 변경 시 timer reset
  // → user manual scroll 해서 §X 로 가도 §X 에서 7s 후 §X+1 로 이어짐. paused 트리거 없음.
  useEffect(() => {
    if (active < 0) return;
    if (active >= SECTION_COUNT - 1) return;
    const timer = window.setTimeout(() => {
      const next = sectionRefs.current[active + 1];
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
          <ProgressDots count={SECTION_COUNT} active={active} />
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
                className="flex flex-col justify-center px-6 py-20 sm:px-12 sm:py-24 lg:min-h-screen lg:px-16 lg:py-0"
              >
                {s.kind === "hero" ? (
                  <>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-accent-700 opacity-0 [animation:hero-fade_700ms_var(--ease)_120ms_forwards]">
                      {s.eyebrow}
                    </p>
                    <h1 className="mt-4 text-[36px] font-semibold leading-[1.05] tracking-headline text-slate-900 sm:text-[48px] lg:text-[56px]">
                      <span className="inline-block translate-y-4 opacity-0 [animation:hero-rise_900ms_var(--ease)_220ms_forwards]">
                        {s.title1}
                      </span>
                      <br />
                      <span className="inline-block translate-y-4 text-accent-700 opacity-0 [animation:hero-rise_900ms_var(--ease)_420ms_forwards]">
                        {s.title2}
                      </span>
                    </h1>
                    <p className="mt-5 max-w-md text-[14px] leading-relaxed text-slate-500 opacity-0 [animation:hero-fade_700ms_var(--ease)_700ms_forwards] sm:text-[15px]">
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
                    <h2 className="text-[28px] font-semibold leading-[1.15] tracking-headline text-slate-900 sm:text-[36px] lg:text-[44px]">
                      <span
                        className="inline-block transition-all duration-700"
                        style={{
                          transitionTimingFunction: EASE,
                          opacity: isActive ? 1 : 0,
                          transform: isActive ? "translateY(0)" : "translateY(16px)",
                        }}
                      >
                        {s.line1}
                      </span>
                      <br />
                      <span
                        className="inline-block text-slate-500 transition-all duration-700"
                        style={{
                          transitionTimingFunction: EASE,
                          transitionDelay: isActive ? "180ms" : "0ms",
                          opacity: isActive ? 1 : 0,
                          transform: isActive ? "translateY(0)" : "translateY(16px)",
                        }}
                      >
                        {s.line2}
                      </span>
                    </h2>
                    {s.line3 && (
                      <p
                        className="mt-3 text-[20px] leading-[1.2] tracking-headline text-slate-500 transition-all duration-700 sm:text-[24px] lg:text-[28px]"
                        style={{
                          transitionTimingFunction: EASE,
                          transitionDelay: isActive ? "340ms" : "0ms",
                          opacity: isActive ? 1 : 0,
                          transform: isActive ? "translateY(0)" : "translateY(16px)",
                        }}
                      >
                        {s.line3}
                      </p>
                    )}
                    {s.aux && (
                      <p
                        className="mt-6 text-[13px] text-slate-500 transition-all duration-700 sm:text-[14px]"
                        style={{
                          transitionTimingFunction: EASE,
                          transitionDelay: isActive ? "500ms" : "0ms",
                          opacity: isActive ? 1 : 0,
                          transform: isActive ? "translateY(0)" : "translateY(8px)",
                        }}
                      >
                        ── {s.aux}
                      </p>
                    )}
                  </>
                )}
                <div className="mt-10 lg:hidden">
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

function ProgressDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 gap-2">
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

function CountUp({
  to,
  active,
  durationMs = 1400,
}: {
  to: number;
  active: boolean;
  durationMs?: number;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) {
      setN(0);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, to, durationMs]);
  return <>{n.toLocaleString()}</>;
}

function MockKpi({ mock, active }: { mock: MockData; active: boolean }) {
  const t = useTranslations("qrCampaigns.mock");
  const distNum = parseInt(mock.distributedValue.replace(/[^\d]/g, ""), 10);
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-all duration-700"
      style={{
        transitionTimingFunction: EASE,
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="mb-3 inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-700">
        {t("kpiBeforeKurl")}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold text-slate-900">{mock.campaignName}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
          {t("kpiStatus")}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2.5">
        <KpiCell
          label={t("kpiDistributed")}
          active={active}
          delay={200}
          renderValue={() => (active ? <CountUp to={distNum} active={active} /> : "0")}
        />
        <KpiCell label={t("kpiClicks")} active={active} delay={350} muted />
        <KpiCell label={t("kpiPer100")} active={active} delay={450} muted />
        <KpiCell label={t("kpiHour")} active={active} delay={550} muted />
      </div>
    </div>
  );
}

function KpiCell({
  label,
  renderValue,
  muted,
  active,
  delay,
}: {
  label: string;
  renderValue?: () => React.ReactNode;
  muted?: boolean;
  active: boolean;
  delay: number;
}) {
  return (
    <div
      className={
        "rounded-xl border px-3 py-2.5 transition-all duration-500 " +
        (muted
          ? "border-dashed border-slate-200 bg-slate-50/50"
          : "border-slate-200 bg-white")
      }
      style={{
        transitionTimingFunction: EASE,
        transitionDelay: active ? `${delay}ms` : "0ms",
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(8px)",
      }}
    >
      <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={
          "mt-1 text-[18px] font-semibold tabular-nums leading-tight tracking-headline " +
          (muted ? "animate-pulse text-slate-300" : "text-slate-900")
        }
      >
        {renderValue ? renderValue() : "?"}
      </p>
    </div>
  );
}

function MockBatch({ mock, active }: { mock: MockData; active: boolean }) {
  const t = useTranslations("qrCampaigns.mock");
  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-all duration-700"
      style={{
        transitionTimingFunction: EASE,
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
        <p className="text-[14px] font-semibold text-slate-900">{t("batchTitle")}</p>
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
          <Plus className="h-3 w-3" aria-hidden />
          {t("batchAdd")}
        </span>
      </div>
      <div className="grid grid-cols-[2fr_1fr_1.2fr_0.8fr_0.8fr] gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-2.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
        <span>{t("batchColName")}</span>
        <span>{t("batchColArea")}</span>
        <span>{t("batchColDist")}</span>
        <span className="text-right">{t("batchColQty")}</span>
        <span className="text-right">{t("batchColStatus")}</span>
      </div>
      {mock.rows.map((row, i) => (
        <div
          key={row.name}
          className="grid grid-cols-[2fr_1fr_1.2fr_0.8fr_0.8fr] items-center gap-2 border-b border-slate-100 px-5 py-3 text-[12px] transition-all duration-500 last:border-b-0"
          style={{
            transitionTimingFunction: EASE,
            transitionDelay: active ? `${200 + i * 110}ms` : "0ms",
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(-10px)",
          }}
        >
          <span className="truncate font-medium text-slate-900">{row.name}</span>
          <span className="truncate text-slate-600">{row.area}</span>
          <span className="truncate text-slate-600">{row.dist}</span>
          <span className="text-right tabular-nums text-slate-700">
            {row.qty.toLocaleString()}
            {t("batchUnit")}
          </span>
          <span className="flex items-center justify-end gap-1 text-[11px] text-accent-700">
            <Check className="h-3 w-3" aria-hidden />
            <span className="hidden sm:inline">{t("batchDone")}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function MockPoster({ active }: { mock: MockData; active: boolean }) {
  const t = useTranslations("qrCampaigns.mock");
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL("https://kurl.me", {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 256,
    })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-all duration-700"
      style={{
        transitionTimingFunction: EASE,
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(12px)",
      }}
    >
      {/* PDF 페이지 시뮬레이션 + 박스 이동 + QR 등장 시퀀스 */}
      <div className="relative aspect-[1/1.414] overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        {/* 회색 placeholder content — 디자이너가 만든 포스터 디자인의 윤곽 흉내 */}
        <div className="absolute inset-0 flex flex-col gap-2.5 p-6">
          <div className="h-3 w-3/5 rounded-sm bg-slate-200" />
          <div className="h-2 w-2/5 rounded-sm bg-slate-200" />
          <div className="mt-4 h-1.5 w-full rounded-sm bg-slate-100" />
          <div className="h-1.5 w-11/12 rounded-sm bg-slate-100" />
          <div className="h-1.5 w-4/5 rounded-sm bg-slate-100" />
          <div className="mt-auto flex flex-col gap-1.5">
            <div className="h-1.5 w-2/5 rounded-sm bg-slate-100" />
            <div className="h-2 w-1/3 rounded-sm bg-slate-200" />
          </div>
        </div>

        {/* QR 박스 — active 시 화면 중앙 → 우하단으로 이동하면서 크기 축소, QR fade-in */}
        <div
          className="absolute rounded-md border-2 border-accent-600 bg-white transition-all duration-[1000ms]"
          style={{
            transitionTimingFunction: EASE,
            left: active ? "60%" : "26%",
            top: active ? "60%" : "26%",
            width: active ? "30%" : "48%",
            height: active ? "30%" : "48%",
            transitionDelay: active ? "700ms" : "0ms",
            opacity: active ? 1 : 0,
            boxShadow: "0 4px 16px rgba(5,150,105,0.18)",
          }}
        >
          {qrUrl ? (
            // 마케팅 mock 의 작은 QR placeholder — next/image 의 최적화는 data URL 에 의미 없음.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrUrl}
              alt=""
              draggable={false}
              className="block h-full w-full transition-opacity duration-700"
              style={{
                transitionTimingFunction: EASE,
                transitionDelay: active ? "1900ms" : "0ms",
                opacity: active ? 1 : 0,
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-[10px] font-medium uppercase tracking-wider text-accent-700">
              {t("posterBoxLabel")}
            </div>
          )}
          {/* resize handle 흉내 */}
          <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full border-2 border-accent-600 bg-white" />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
        <p className="text-[12px] font-semibold text-slate-900">{t("posterTitle")}</p>
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-medium text-accent-700 transition-all duration-500"
          style={{
            transitionTimingFunction: EASE,
            transitionDelay: active ? "2400ms" : "0ms",
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(6px)",
          }}
        >
          <QrCode className="h-3 w-3" aria-hidden />
          {t("posterPerBatch")}
        </span>
      </div>
    </div>
  );
}

function MockBars({ mock, active }: { mock: MockData; active: boolean }) {
  const t = useTranslations("qrCampaigns.mock");
  const max = Math.max(...mock.bars.map((b) => b.value));
  return (
    <div
      className="space-y-3 transition-all duration-700"
      style={{
        transitionTimingFunction: EASE,
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[14px] font-semibold text-slate-900">{t("barsTitle")}</p>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <ArrowDown className="h-3 w-3" aria-hidden />
            {t("barsSort")}
          </span>
        </div>
        <div className="space-y-3">
          {mock.bars.map((b, i) => {
            const pct = (b.value / max) * 100;
            const isTop = i === 0;
            const delay = 200 + i * 180;
            return (
              <div
                key={b.label}
                className="transition-opacity duration-500"
                style={{
                  transitionDelay: active ? `${delay}ms` : "0ms",
                  opacity: active ? 1 : 0,
                }}
              >
                <div className="flex items-center justify-between text-[12px]">
                  <span
                    className={
                      isTop ? "font-semibold text-slate-900" : "text-slate-700"
                    }
                  >
                    {b.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        "tabular-nums " +
                        (isTop ? "font-semibold text-accent-700" : "text-slate-600")
                      }
                    >
                      {active ? <CountUp to={b.value} active={active} /> : 0}
                    </span>
                    {isTop && (
                      <span
                        className="rounded-md bg-accent-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent-700 transition-all duration-500"
                        style={{
                          transitionTimingFunction: EASE,
                          transitionDelay: active ? `${delay + 900}ms` : "0ms",
                          opacity: active ? 1 : 0,
                          transform: active ? "scale(1)" : "scale(0.6)",
                        }}
                      >
                        {t("barsTop")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={
                      "h-full rounded-full transition-[width] duration-[1200ms] " +
                      (isTop ? "bg-accent-600" : "bg-slate-300")
                    }
                    style={{
                      transitionTimingFunction: EASE,
                      transitionDelay: active ? `${delay + 150}ms` : "0ms",
                      width: active ? `${pct}%` : "0%",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div
        className="rounded-2xl border border-accent-200 bg-accent-50/50 px-4 py-3.5 transition-all duration-500"
        style={{
          transitionTimingFunction: EASE,
          transitionDelay: active ? "1500ms" : "0ms",
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(12px)",
        }}
      >
        <p className="text-[10px] font-medium uppercase tracking-wider text-accent-700">
          {t("barsRecoTitle")}
        </p>
        <p className="mt-1 text-[14px] font-medium text-slate-900">{mock.reco}</p>
        <p className="mt-1 text-[11px] text-slate-600">{t("barsRecoEstimate")}</p>
      </div>
    </div>
  );
}

function MockCases({ mock, active }: { mock: MockData; active: boolean }) {
  const t = useTranslations("qrCampaigns.mock");
  // 모든 case 의 after 값 중 최댓값으로 normalize — bar 가 같은 scale 에서 비교됨.
  const max = Math.max(...mock.cases.map((c) => c.after));
  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-all duration-700"
      style={{
        transitionTimingFunction: EASE,
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="border-b border-slate-200 px-5 py-3.5">
        <p className="text-[14px] font-semibold text-slate-900">{t("casesTitle")}</p>
      </div>
      {mock.cases.map((c, i) => {
        const beforePct = (c.before / max) * 100;
        const afterPct = (c.after / max) * 100;
        const rowDelay = 200 + i * 140;
        return (
          <div
            key={c.biz}
            className="border-b border-slate-100 px-5 py-3.5 transition-all duration-500 last:border-b-0"
            style={{
              transitionTimingFunction: EASE,
              transitionDelay: active ? `${rowDelay}ms` : "0ms",
              opacity: active ? 1 : 0,
              transform: active ? "translateY(0)" : "translateY(-10px)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-slate-900">{c.biz}</p>
                <p className="mt-0.5 truncate text-[10px] text-slate-500">
                  {c.area} · {c.action}
                </p>
              </div>
              <span className="flex-shrink-0 rounded-md bg-accent-50 px-2 py-1 text-[14px] font-semibold tabular-nums leading-none tracking-headline text-accent-700">
                {c.multiplier}
              </span>
            </div>

            <div className="mt-3 space-y-1.5">
              <CaseBar
                label={t("casesBefore")}
                value={c.before}
                pct={beforePct}
                active={active}
                delay={rowDelay + 300}
                accent={false}
              />
              <CaseBar
                label={t("casesAfter")}
                value={c.after}
                pct={afterPct}
                active={active}
                delay={rowDelay + 500}
                accent
              />
            </div>
          </div>
        );
      })}
      <div className="px-5 py-2.5">
        <p className="text-[10px] text-slate-500">{t("casesFooter")}</p>
      </div>
    </div>
  );
}

function CaseBar({
  label,
  value,
  pct,
  active,
  delay,
  accent,
}: {
  label: string;
  value: number;
  pct: number;
  active: boolean;
  delay: number;
  accent: boolean;
}) {
  return (
    <div className="grid grid-cols-[40px_1fr_auto] items-center gap-2">
      <span
        className={
          "text-[10px] " + (accent ? "font-medium text-accent-700" : "text-slate-500")
        }
      >
        {label}
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={
            "h-full rounded-full transition-[width] " +
            (accent ? "bg-accent-600 duration-[1000ms]" : "bg-slate-300 duration-[800ms]")
          }
          style={{
            transitionTimingFunction: EASE,
            transitionDelay: active ? `${delay}ms` : "0ms",
            width: active ? `${pct}%` : "0%",
          }}
        />
      </div>
      <span
        className={
          "text-[11px] tabular-nums " +
          (accent ? "font-semibold text-accent-700" : "text-slate-500")
        }
      >
        {value}
      </span>
    </div>
  );
}

function MockTimeline({ mock, active }: { mock: MockData; active: boolean }) {
  const t = useTranslations("qrCampaigns.mock");
  return (
    <div
      className="space-y-3 transition-all duration-700"
      style={{
        transitionTimingFunction: EASE,
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
        {/* timeline mini header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 text-[11px]">
          <span className="tabular-nums text-slate-500">{mock.startDate}</span>
          <div className="relative h-px flex-1 bg-slate-200">
            <div
              className="absolute left-0 top-0 h-full bg-accent-600 transition-[width] duration-[1200ms]"
              style={{
                transitionTimingFunction: EASE,
                transitionDelay: active ? "200ms" : "0ms",
                width: active ? "100%" : "0%",
              }}
            />
            <div
              className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-accent-600 transition-transform duration-300"
              style={{
                transitionDelay: active ? "1400ms" : "0ms",
                transform: active ? "translateY(-50%) scale(1.4)" : "translateY(-50%) scale(1)",
              }}
            />
          </div>
          <span
            className="font-medium text-accent-700 transition-opacity duration-500"
            style={{
              transitionDelay: active ? "1500ms" : "0ms",
              opacity: active ? 1 : 0.4,
            }}
          >
            {t("timelineExpired")}
          </span>
        </div>

        {/* iPhone mockup — 캠페인 진행 중 화면 → 만료 후 화면 자동 슬라이드 */}
        <div className="relative grid place-items-center bg-gradient-to-b from-slate-100 to-slate-50 px-6 py-8">
          {/* date pill 표시 (옆) */}
          <div
            className="absolute left-5 top-5 rounded-md bg-white/80 px-2 py-1 text-[10px] font-medium text-slate-500 shadow-sm transition-opacity duration-500"
            style={{ transitionDelay: active ? "400ms" : "0ms", opacity: active ? 1 : 0 }}
          >
            {mock.endDate}
          </div>
          <div
            className="absolute right-5 top-5 rounded-md bg-accent-50 px-2 py-1 text-[10px] font-medium text-accent-700 shadow-sm transition-all duration-500"
            style={{
              transitionTimingFunction: EASE,
              transitionDelay: active ? "1700ms" : "0ms",
              opacity: active ? 1 : 0,
              transform: active ? "translateY(0)" : "translateY(-6px)",
            }}
          >
            {t("timelineExpired")} →
          </div>

          {/* phone frame */}
          <div className="relative h-[280px] w-[150px] overflow-hidden rounded-[28px] border-[5px] border-slate-900 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.22)]">
            {/* notch */}
            <div className="absolute left-1/2 top-1.5 z-20 h-2 w-10 -translate-x-1/2 rounded-full bg-slate-900" />

            {/* screen A — 캠페인 진행 중 (rose) */}
            <div
              className="absolute inset-0 transition-transform duration-700"
              style={{
                transitionTimingFunction: EASE,
                transitionDelay: active ? "1700ms" : "0ms",
                transform: active ? "translateX(-100%)" : "translateX(0%)",
              }}
            >
              <PhoneScreen kind="before" />
            </div>

            {/* screen B — 만료 후 (accent) */}
            <div
              className="absolute inset-0 transition-transform duration-700"
              style={{
                transitionTimingFunction: EASE,
                transitionDelay: active ? "1700ms" : "0ms",
                transform: active ? "translateX(0%)" : "translateX(100%)",
              }}
            >
              <PhoneScreen
                kind="after"
                nextLabel={t("timelineNext")}
                chipLabel={t("timelineChip")}
              />
            </div>
          </div>
        </div>
      </div>
      <p
        className="px-1 text-[11px] text-slate-500 transition-opacity duration-500"
        style={{
          transitionDelay: active ? "2600ms" : "0ms",
          opacity: active ? 1 : 0,
        }}
      >
        {t("timelineFoot")}
      </p>
    </div>
  );
}

function PhoneScreen({
  kind,
  nextLabel,
  chipLabel,
}: {
  kind: "before" | "after";
  nextLabel?: string;
  chipLabel?: string;
}) {
  const isAfter = kind === "after";
  return (
    <div
      className={
        "flex h-full flex-col gap-1.5 px-2.5 pb-3 pt-9 " +
        (isAfter ? "bg-accent-50" : "bg-rose-50")
      }
    >
      <div
        className={
          "h-12 w-full rounded-md " + (isAfter ? "bg-accent-200" : "bg-rose-200")
        }
      />
      <div
        className={
          "h-1.5 w-3/5 rounded-full " + (isAfter ? "bg-accent-500" : "bg-rose-500")
        }
      />
      <div className="space-y-1">
        <div className="h-1 w-full rounded-full bg-slate-200" />
        <div className="h-1 w-5/6 rounded-full bg-slate-200" />
        <div className="h-1 w-2/3 rounded-full bg-slate-200" />
      </div>
      {isAfter && nextLabel && chipLabel ? (
        <div className="mt-auto flex flex-col items-start gap-1">
          <span className="text-[7px] font-medium uppercase tracking-wider text-accent-700">
            {nextLabel}
          </span>
          <span className="rounded-md bg-accent-600 px-1.5 py-0.5 text-[8px] font-medium text-white">
            {chipLabel}
          </span>
        </div>
      ) : (
        <div className="mt-auto h-5 w-full rounded-md bg-rose-600" />
      )}
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
        <h2 className="mt-6 text-[32px] font-semibold leading-tight tracking-headline sm:text-[44px]">
          {t("title")}
        </h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={ctaHref}>
            <Button variant="accent" className="h-12 rounded-xl px-7 text-[14px] font-medium">
              {t("primary")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
          {!authenticated && (
            <Link href="/login">
              <Button
                variant="ghost"
                className="h-12 rounded-xl px-6 text-[13px] font-medium text-white hover:bg-white/10"
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
