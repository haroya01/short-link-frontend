"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ShortenForm } from "@/components/shorten-form";
import { ResultCard } from "@/components/result-card";
import { FeatureCarousel } from "@/components/feature-carousel";
import { WhyKurl } from "@/components/why-kurl";
import { HomeFaq } from "@/components/home-faq";
import { HomeCounters, usePublicTotals } from "@/components/home-counters";
import { RecentLinks } from "@/components/recent-links";
import { useAuth } from "@/lib/auth";
import { recordRecent, useRecentLinks } from "@/lib/recent-links";
import { Link } from "@/i18n/navigation";
import type { CreateLinkResponse } from "@/types";

export default function HomePage() {
  const { authenticated } = useAuth();
  const t = useTranslations("home");
  const [results, setResults] = useState<
    { res: CreateLinkResponse; original: string; channel?: string }[] | null
  >(null);
  const recent = useRecentLinks();
  const totals = usePublicTotals();
  const showStats = totals != null && (totals.links > 0 || totals.clicks > 0);

  return (
    <div>
      <section className="grid-bg">
        <div className="container max-w-3xl py-20 sm:py-28">
          <div className="mb-10 space-y-3 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-700">
              {t("tagline")}
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              {t("headline1")}
              <br />
              <span className="text-slate-500">{t("headline2")}</span>
            </h1>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-500">
              {t("subhead")}
            </p>
          </div>

          <ShortenForm
            authenticated={authenticated}
            onShortened={(items) => {
              setResults(
                items.map((it) => ({
                  res: it.res,
                  original: it.originalUrl,
                  channel: it.channel,
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

          <div className="mt-6 min-h-[64px]">
            {results && results.length > 0 ? (
              <div className="space-y-3">
                {results.map((r) => (
                  <ResultCard
                    key={r.res.shortCode}
                    result={r.res}
                    originalUrl={r.original}
                    channel={r.channel}
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
                    href="/dashboard"
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
      </section>

      <Previews t={t} />

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

/**
 * Pre-signup taster strip: four labelled cards spelling out what the user actually gets after
 * shortening. Each card links to a place where they can see it for real (demo, public profile,
 * pricing). No screenshots — just iconified labels with one-line context, so the strip stays
 * honest about being a teaser rather than pretending to be the full UI.
 */
function Previews({ t }: { t: ReturnType<typeof useTranslations<"home">> }) {
  const items = [
    { key: "stats", href: "/demo", label: t("previews.stats.title"), desc: t("previews.stats.desc") },
    { key: "viral", href: "/demo", label: t("previews.viral.title"), desc: t("previews.viral.desc") },
    { key: "profile", href: "/demo", label: t("previews.profile.title"), desc: t("previews.profile.desc") },
    { key: "domain", href: "/pricing", label: t("previews.domain.title"), desc: t("previews.domain.desc") },
  ];
  return (
    <section className="border-t border-slate-100 bg-slate-50/50">
      <div className="container max-w-5xl py-12">
        <p className="mb-4 text-center text-xs text-slate-500">{t("previews.eyebrow")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <Link
              key={it.key}
              href={it.href}
              className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <p className="text-sm font-medium text-slate-900">{it.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{it.desc}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-accent-700">
                {t("previews.see")}
                <ArrowRight className="h-2.5 w-2.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

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
    <section className="border-t border-slate-100 bg-white">
      <div className={"container py-20 " + (wide ? "max-w-5xl" : "max-w-3xl")}>
        {hasHeader && (
          <div className="mb-12 space-y-2 text-center">
            {eyebrow && (
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-700">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                {title}
              </h2>
            )}
            {subhead && (
              <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-500">{subhead}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
