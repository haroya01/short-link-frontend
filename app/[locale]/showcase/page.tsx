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
      {/* CTA-first hero: visitors see the value prop + sign-in button before they even start
          scrolling the examples. Keeps the page friendly for non-developers who want one
          straightforward path rather than a tour. */}
      <section className="border-b border-slate-100 bg-white">
        <div className="container max-w-3xl py-16 text-center sm:py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-700">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {t("ctaTitle")}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">
            {t("ctaSubhead")}
          </p>
          <Link
            href="/login?next=/profile/auto"
            className="group mt-6 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {t("cta")}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>

          {/* Scroll cue — anchors the hero to the carousel below so visitors don't think the
              CTA is the entire page. The down-chevron bobs gently to signal "more below" */}
          <a
            href="#showcase-examples"
            className="mt-10 inline-flex flex-col items-center gap-1 text-[11px] text-slate-400 transition hover:text-slate-600"
            aria-label={t("scrollCue")}
          >
            <span>{t("scrollCue")}</span>
            <ChevronDown className="h-3.5 w-3.5 showcase-scroll-cue-icon" />
          </a>
        </div>
      </section>

      <section id="showcase-examples" className="bg-white py-12 sm:py-16">
        <div className="container max-w-3xl mb-8 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {t("title")}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            {t("subhead")}
          </p>
        </div>
        <ProfileShowcase />
      </section>
    </div>
  );
}
