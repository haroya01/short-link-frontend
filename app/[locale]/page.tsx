"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ShortenForm } from "@/components/shorten-form";
import { ResultCard } from "@/components/result-card";
import { FeatureCarousel } from "@/components/feature-carousel";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import type { CreateLinkResponse } from "@/types";

export default function HomePage() {
  const { authenticated } = useAuth();
  const t = useTranslations("home");
  const [result, setResult] = useState<{ res: CreateLinkResponse; original: string } | null>(null);

  return (
    <div>
      <section className="grid-bg border-b border-slate-200">
        <div className="container max-w-3xl py-16 sm:py-24">
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
            onShortened={(res, original) => setResult({ res, original })}
          />

          {result && (
            <div className="mt-6 space-y-3">
              <ResultCard result={result.res} originalUrl={result.original} />
              {!authenticated && (
                <Link
                  href="/login"
                  className="flex items-center justify-between rounded-lg border border-accent-200 bg-accent-50/40 px-4 py-3 text-sm transition hover:bg-accent-50"
                >
                  <span className="text-slate-700">
                    {t.rich("loginCta", {
                      clickStats: (chunks: React.ReactNode) => (
                        <span className="font-semibold text-accent-700">{chunks}</span>
                      ),
                    })}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-accent-700" />
                </Link>
              )}
            </div>
          )}

          {!authenticated && !result && (
            <p className="mt-4 text-center text-xs text-slate-500">{t("anonymousHint")}</p>
          )}

          {authenticated && (
            <div className="mt-8 flex justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
              >
                {t("ctaSeeLinks")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="container max-w-5xl py-16">
        <FeatureCarousel />
      </section>
    </div>
  );
}
