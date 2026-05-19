"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ShortenForm } from "@/components/shorten-form";
import { ResultCard } from "@/components/result-card";
import { FeatureCarousel } from "@/components/feature-carousel";
import { LandingPreviews } from "@/components/landing-previews";
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
      {/*
       * Hero re-think (PR #240) — earlier version was a perfectly-centered eyebrow / h1 / subhead
       * stack on a plain grid background, which read as "default Tailwind landing template" to
       * the eye. Now:
       *   - `hero-mesh + hero-noise` paint an off-center radial bloom in the accent-green family
       *     plus a subtle grain so the surface stops being mathematically flat
       *   - the eyebrow drops onto a 1px accent bar that anchors it to the headline column on the
       *     left edge of the centered measure — small grid-break that signals "designed", not
       *     "generated"
       *   - the headline is built as two lines with mixed weights: the brand assertion in a
       *     display serif (Instrument Serif), the qualifier in Pretendard semibold. The mixed
       *     family is the strongest distinctive cue per the frontend-design SKILL.md guidance
       *   - `.hero-stagger` cascades the children in over ~500ms with `--hi` indexing instead of
       *     the whole hero fading in as one slab
       * Everything stays inside the brand-green accent ramp + Pretendard / Instrument Serif —
       * no off-brand color, no maximalist chaos.
       */}
      <section className="relative isolate overflow-hidden grid-bg hero-mesh hero-noise">
        <div className="container relative z-10 max-w-3xl py-20 sm:py-28">
          <div className="hero-stagger mb-10 space-y-4 sm:mb-12">
            <div
              className="flex items-center justify-center gap-3 text-center"
              style={{ ["--hi" as string]: 0 } as React.CSSProperties}
            >
              <span aria-hidden className="hidden h-px w-10 bg-accent-300/70 sm:block" />
              <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700">
                {t("tagline")}
              </p>
              <span aria-hidden className="hidden h-px w-10 bg-accent-300/70 sm:block" />
            </div>
            <h1
              className="text-balance text-center text-[40px] leading-[1.04] tracking-headline text-slate-900 sm:text-[60px]"
              style={{ ["--hi" as string]: 1 } as React.CSSProperties}
            >
              <span className="font-display italic">{t("headline1")}</span>
              <br />
              <span className="font-semibold text-slate-500">{t("headline2")}</span>
            </h1>
            <p
              className="mx-auto max-w-md text-balance text-center text-[15px] leading-relaxed text-slate-500"
              style={{ ["--hi" as string]: 2 } as React.CSSProperties}
            >
              {t("subhead")}
            </p>
          </div>

          {/*
           * Form sits outside the hero-stagger wrapper because the staggered cascade in the
           * headline already lasts ~360ms; making the form wait another 90ms past the subhead
           * forces visitors past the "I can already see where to paste my URL" moment. The
           * `profile-fade` keyframe gives it the same fade-in feel without the cascading delay.
           */}
          <div
            className="profile-fade"
            style={{ ["--idx" as string]: 4 } as React.CSSProperties}
          >
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
          </div>

          <div className="mt-6 min-h-[64px]">
            {results && results.length > 0 ? (
              <div className="space-y-3">
                {results.map((r) => (
                  <ResultCard
                    key={r.res.shortCode}
                    result={r.res}
                    originalUrl={r.original}
                    channel={r.channel}
                    authenticated={authenticated}
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

      <LandingPreviews />

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

/*
 * Section primitive — earlier version stacked a centered eyebrow / h2 / subhead on every block.
 * Now each section opens with the shared `.section-divider` (hairline + accent dot) so the
 * transition between blocks reads as a deliberate page break, then the eyebrow / title use the
 * same headline tracking + serif-italic display swap as the hero. Tracking and weight pulled to
 * match the hero typography rather than re-stating Tailwind defaults.
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
    <section className="bg-white">
      <div className={"container py-16 sm:py-20 " + (wide ? "max-w-5xl" : "max-w-3xl")}>
        <div className="section-divider mx-auto mb-12 w-full max-w-xl" aria-hidden />
        {hasHeader && (
          <div className="mb-10 space-y-3 text-center sm:mb-14">
            {eyebrow && (
              <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="text-balance text-[26px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[34px]">
                {title}
              </h2>
            )}
            {subhead && (
              <p className="mx-auto max-w-md text-balance text-[14px] leading-relaxed text-slate-500">
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
