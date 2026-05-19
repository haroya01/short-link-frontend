import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, ChevronDown } from "lucide-react";
import { ProfileShowcase } from "@/components/profile-showcase";
import { Link } from "@/i18n/navigation";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "showcase" });
  return {
    title: `${t("title")} · kurl`,
    description: t("subhead"),
    alternates: { canonical: `${SITE_URL}/${locale}/showcase` },
    openGraph: {
      title: `${t("title")} · kurl`,
      description: t("subhead"),
      url: `${SITE_URL}/${locale}/showcase`,
      type: "website",
      siteName: "kurl",
      images: [
        {
          url: `${SITE_URL}/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${t("title")} · kurl`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${t("title")} · kurl`,
      description: t("subhead"),
      images: [`${SITE_URL}/${locale}/opengraph-image`],
    },
  };
}

export default async function ShowcasePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "showcase" });

  return (
    <div className="overflow-hidden">
      {/* CTA-first hero — flat white surface (no mesh / no noise) so the page reads as restrained
          rather than busy. Single-CTA discipline (one slate-900 primary + scroll cue) kept so the
          surface direction matches the landing. Headline is Pretendard semibold with
          `.tracking-headline` (−0.025em) — same family/treatment as the landing hero. */}
      <section className="relative isolate overflow-hidden bg-white">
        <div className="container relative z-10 max-w-3xl py-20 text-center sm:py-28">
          <div className="hero-stagger space-y-4">
            <div
              className="flex items-center justify-center gap-3"
              style={{ ["--hi" as string]: 0 } as React.CSSProperties}
            >
              <span aria-hidden className="hidden h-px w-10 bg-accent-300/70 sm:block" />
              <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700">
                {t("eyebrow")}
              </p>
              <span aria-hidden className="hidden h-px w-10 bg-accent-300/70 sm:block" />
            </div>
            <h1
              className="text-balance text-[34px] font-semibold leading-[1.05] tracking-headline text-slate-900 sm:text-[48px]"
              style={{ ["--hi" as string]: 1 } as React.CSSProperties}
            >
              {t("ctaTitle")}
            </h1>
            <p
              className="mx-auto max-w-md text-balance text-[15px] leading-relaxed text-slate-500"
              style={{ ["--hi" as string]: 2 } as React.CSSProperties}
            >
              {t("ctaSubhead")}
            </p>
            <div
              className="flex flex-col items-center gap-8 pt-2"
              style={{ ["--hi" as string]: 3 } as React.CSSProperties}
            >
              <Link
                href="/login?next=/profile/auto"
                className="group inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.5)] transition hover:bg-slate-800 hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.6)]"
              >
                {t("cta")}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>

              {/* Scroll cue — anchors the hero to the carousel below so visitors don't think the
                  CTA is the entire page. The down-chevron bobs gently to signal "more below" */}
              <a
                href="#showcase-examples"
                className="flex flex-col items-center gap-1 text-[11px] text-slate-400 transition hover:text-slate-600"
                aria-label={t("scrollCue")}
              >
                <span>{t("scrollCue")}</span>
                <ChevronDown className="h-3.5 w-3.5 showcase-scroll-cue-icon" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="showcase-examples" className="bg-white py-16 sm:py-20">
        <div className="container max-w-3xl mb-10">
          <div className="section-divider mx-auto mb-10 w-full max-w-xl" aria-hidden />
          <div className="text-center">
            <h2 className="text-balance text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[30px]">
              {t("title")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-balance text-[14px] leading-relaxed text-slate-500">
              {t("subhead")}
            </p>
          </div>
        </div>
        <ProfileShowcase />
      </section>
    </div>
  );
}
