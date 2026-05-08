"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ShortenForm } from "@/components/shorten-form";
import { ResultCard } from "@/components/result-card";
import { FeatureCarousel } from "@/components/feature-carousel";
import { HomeFaq } from "@/components/home-faq";
import { HomeCounters } from "@/components/home-counters";
import { RecentLinks } from "@/components/recent-links";
import { useAuth } from "@/lib/auth";
import { recordRecent, useRecentLinks } from "@/lib/recent-links";
import { Link } from "@/i18n/navigation";
import type { CreateLinkResponse } from "@/types";

export default function HomePage() {
  const { authenticated } = useAuth();
  const t = useTranslations("home");
  const [result, setResult] = useState<{ res: CreateLinkResponse; original: string } | null>(null);
  const recent = useRecentLinks();

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
            onShortened={(res, original) => {
              setResult({ res, original });
              recordRecent({
                shortCode: res.shortCode,
                shortUrl: res.shortUrl,
                originalUrl: original,
                createdAt: Date.now(),
                claimToken: res.claimToken,
              });
            }}
          />

          <div className="mt-6 min-h-[64px]">
            {result ? (
              <div className="space-y-3">
                <ResultCard result={result.res} originalUrl={result.original} />
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
              <p className="text-center text-xs text-slate-500">{t("anonymousHint")}</p>
            ) : null}
          </div>
        </div>
      </section>

      {!authenticated && recent.length > 0 && (
        <Section eyebrow={t("recentEyebrow")} title={t("recentTitle")} subhead={t("recentSubhead")}>
          <RecentLinks />
        </Section>
      )}

      <Section
        bg="muted"
        eyebrow={t("statsEyebrow")}
        title={t("statsTitle")}
        subhead={t("statsSubhead")}
      >
        <HomeCounters />
      </Section>

      <Section eyebrow={t("featuresEyebrow")} title={t("featuresTitle")} subhead={t("featuresSubhead")}>
        <div className="mx-auto max-w-5xl">
          <FeatureCarousel />
        </div>
      </Section>

      <Section bg="muted">
        <HomeFaq />
      </Section>
    </div>
  );
}

function Section({
  children,
  eyebrow,
  title,
  subhead,
  bg,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  subhead?: string;
  bg?: "muted";
}) {
  const hasHeader = eyebrow || title || subhead;
  return (
    <section
      className={
        "border-t border-slate-100 " + (bg === "muted" ? "bg-slate-50/60" : "bg-white")
      }
    >
      <div className="container max-w-3xl py-20">
        {hasHeader && (
          <div className="mb-10 space-y-2 text-center">
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
