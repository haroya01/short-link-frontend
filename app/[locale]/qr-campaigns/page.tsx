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
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

type MockRow = { name: string; area: string; dist: string; qty: number };
type MockBar = { label: string; value: number };

type MockData = {
  campaignName: string;
  distributedValue: string;
  rows: MockRow[];
  bars: MockBar[];
  reco: string;
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
    startDate: "2026-05-25",
    endDate: "2026-05-27",
  },
};

export default function QrCampaignsLandingPage() {
  const { authenticated } = useAuth();
  const ctaHref = authenticated ? "/campaigns/new" : "/login";
  const locale = useLocale();
  const mock = MOCK_BY_LOCALE[locale] ?? MOCK_BY_LOCALE.en;

  return (
    <div className="bg-white">
      <Hero ctaHref={ctaHref} />
      <StickyNarrative mock={mock} />
      <FinalCta ctaHref={ctaHref} authenticated={authenticated} />
    </div>
  );
}

function Hero({ ctaHref }: { ctaHref: string }) {
  const t = useTranslations("qrCampaigns.hero");
  return (
    <section className="bg-gradient-to-b from-accent-50/60 via-white to-white">
      <div className="container max-w-5xl py-20 sm:py-28">
        <p className="text-[11px] font-medium uppercase tracking-wider text-accent-700">
          {t("eyebrow")}
        </p>
        <h1 className="mt-4 text-[40px] font-semibold leading-[1.05] tracking-headline text-slate-900 sm:text-[56px] lg:text-[68px]">
          {t("title1")}
          <br />
          <span className="text-accent-700">{t("title2")}</span>
        </h1>
        <div className="mt-10">
          <Link href={ctaHref}>
            <Button variant="accent" className="h-12 rounded-xl px-7 text-[14px] font-medium">
              {t("cta")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

type SectionSpec = {
  line1: string;
  line2: string;
  line3?: string;
  aux?: string;
  mock: React.ReactNode;
};

function StickyNarrative({ mock }: { mock: MockData }) {
  const t = useTranslations("qrCampaigns");
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

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

  const sections: SectionSpec[] = [
    {
      line1: t("s1.line1"),
      line2: t("s1.line2"),
      mock: <MockS1Kpi mock={mock} />,
    },
    {
      line1: t("s2.line1"),
      line2: t("s2.line2"),
      mock: <MockS2Batch mock={mock} />,
    },
    {
      line1: t("s3.line1"),
      line2: t("s3.line2"),
      aux: t("s3.aux"),
      mock: <MockS3Bars mock={mock} />,
    },
    {
      line1: t("s4.line1"),
      line2: t("s4.line2"),
      line3: t("s4.line3"),
      mock: <MockS4Timeline mock={mock} />,
    },
  ];

  return (
    <section className="relative">
      <div className="lg:flex">
        <div className="relative hidden bg-slate-50 lg:flex lg:sticky lg:top-0 lg:h-screen lg:w-1/2 lg:items-center lg:justify-center">
          {sections.map((s, i) => (
            <div
              key={i}
              aria-hidden={i !== active}
              className={
                "absolute inset-0 flex items-center justify-center p-12 transition-opacity duration-700 " +
                (i === active ? "opacity-100" : "pointer-events-none opacity-0")
              }
            >
              <div className="w-full max-w-[480px]">{s.mock}</div>
            </div>
          ))}
        </div>

        <div className="lg:w-1/2">
          {sections.map((s, i) => (
            <div
              key={i}
              ref={(el) => {
                sectionRefs.current[i] = el;
              }}
              className="flex flex-col justify-center px-6 py-20 sm:px-12 sm:py-24 lg:min-h-screen lg:px-16 lg:py-0"
            >
              <h2 className="text-[28px] font-semibold leading-[1.15] tracking-headline text-slate-900 sm:text-[36px] lg:text-[44px]">
                {s.line1}
                <br />
                <span className="text-slate-500">{s.line2}</span>
              </h2>
              {s.line3 && (
                <p className="mt-3 text-[20px] leading-[1.2] tracking-headline text-slate-500 sm:text-[24px] lg:text-[28px]">
                  {s.line3}
                </p>
              )}
              {s.aux && (
                <p className="mt-6 text-[13px] text-slate-500 sm:text-[14px]">── {s.aux}</p>
              )}
              <div className="mt-10 lg:hidden">{s.mock}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MockS1Kpi({ mock }: { mock: MockData }) {
  const t = useTranslations("qrCampaigns.mock");
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold text-slate-900">{mock.campaignName}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-medium text-accent-700">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
          {t("s1Status")}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2.5">
        <KpiCell label={t("s1KpiDistributed")} value={mock.distributedValue} />
        <KpiCell label={t("s1KpiClicks")} value="?" muted />
        <KpiCell label={t("s1KpiPer100")} value="?" muted />
        <KpiCell label={t("s1KpiConversions")} value="?" muted />
      </div>
    </div>
  );
}

function KpiCell({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border px-3 py-2.5 " +
        (muted
          ? "border-dashed border-slate-200 bg-slate-50/50"
          : "border-slate-200 bg-white")
      }
    >
      <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={
          "mt-1 text-[18px] font-semibold tabular-nums leading-tight tracking-headline " +
          (muted ? "text-slate-300" : "text-slate-900")
        }
      >
        {value}
      </p>
    </div>
  );
}

function MockS2Batch({ mock }: { mock: MockData }) {
  const t = useTranslations("qrCampaigns.mock");
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
        <p className="text-[14px] font-semibold text-slate-900">{t("s2Title")}</p>
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
          <Plus className="h-3 w-3" aria-hidden />
          {t("s2Add").replace(/^\+\s*/, "")}
        </span>
      </div>
      <div className="grid grid-cols-[2fr_1fr_1.2fr_0.8fr_0.8fr] gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-2.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
        <span>{t("s2ColName")}</span>
        <span>{t("s2ColArea")}</span>
        <span>{t("s2ColDist")}</span>
        <span className="text-right">{t("s2ColQty")}</span>
        <span className="text-right">{t("s2ColStatus")}</span>
      </div>
      {mock.rows.map((row) => (
        <div
          key={row.name}
          className="grid grid-cols-[2fr_1fr_1.2fr_0.8fr_0.8fr] items-center gap-2 border-b border-slate-100 px-5 py-3 text-[12px] last:border-b-0"
        >
          <span className="truncate font-medium text-slate-900">{row.name}</span>
          <span className="truncate text-slate-600">{row.area}</span>
          <span className="truncate text-slate-600">{row.dist}</span>
          <span className="text-right tabular-nums text-slate-700">
            {row.qty.toLocaleString()}
            {t("s2Unit")}
          </span>
          <span className="flex items-center justify-end gap-1 text-[11px] text-accent-700">
            <Check className="h-3 w-3" aria-hidden />
            <span className="hidden sm:inline">{t("s2Done")}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function MockS3Bars({ mock }: { mock: MockData }) {
  const t = useTranslations("qrCampaigns.mock");
  const max = Math.max(...mock.bars.map((b) => b.value));
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[14px] font-semibold text-slate-900">{t("s3Title")}</p>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <ArrowDown className="h-3 w-3" aria-hidden />
            {t("s3Sort")}
          </span>
        </div>
        <div className="space-y-3">
          {mock.bars.map((b, i) => {
            const pct = (b.value / max) * 100;
            const isTop = i === 0;
            return (
              <div key={b.label}>
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
                      {b.value}
                    </span>
                    {isTop && (
                      <span className="rounded-md bg-accent-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent-700">
                        {t("s3Top")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={
                      "h-full rounded-full transition-[width] duration-700 ease-out " +
                      (isTop ? "bg-accent-600" : "bg-slate-300")
                    }
                    style={{ width: pct + "%" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-2xl border border-accent-200 bg-accent-50/50 px-4 py-3.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-accent-700">
          {t("s3RecoTitle")}
        </p>
        <p className="mt-1 text-[14px] font-medium text-slate-900">{mock.reco}</p>
      </div>
    </div>
  );
}

function MockS4Timeline({ mock }: { mock: MockData }) {
  const t = useTranslations("qrCampaigns.mock");
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
        <div className="relative px-1.5 pt-2">
          <div className="absolute left-1.5 right-1.5 top-[14px] h-px bg-slate-200" />
          <div className="absolute left-0 top-[8px] h-3 w-3 rounded-full border-2 border-accent-600 bg-white" />
          <div className="absolute right-0 top-[8px] h-3 w-3 rounded-full border-2 border-slate-400 bg-white" />
          <div className="h-6" />
          <div className="flex justify-between text-[11px] tabular-nums text-slate-500">
            <span>{mock.startDate}</span>
            <span>{mock.endDate}</span>
          </div>
        </div>
        <div className="mt-5 flex flex-col items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700">
            {t("s4Expired")}
          </span>
          <ArrowDown className="h-4 w-4 text-slate-400" aria-hidden />
          <div className="w-full rounded-xl border border-accent-200 bg-accent-50/40 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-accent-700">
              {t("s4Next")}
            </p>
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] font-medium text-slate-900 shadow-sm">
              <QrCode className="h-3.5 w-3.5 text-accent-700" aria-hidden />
              {t("s4Chip")}
            </div>
          </div>
        </div>
      </div>
      <p className="px-1 text-[11px] text-slate-500">{t("s4Foot")}</p>
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
