import type { Metadata } from "next";
import { serializeJsonLd } from "@/lib/json-ld";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { ProfileShowcase } from "@/modules/profile/components/showcase";
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
  // Title keyword anchored to "link in bio" / "프로필 페이지" — the brand-style hero copy
  // ("내가 원하는 스타일대로") doesn't carry organic search intent on its own. The on-page H1
  // still uses the editorial line; only the meta surface targets keywords.
  const title = t("meta.title");
  const description = t("meta.description");
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/${locale}/showcase` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/showcase`,
      type: "website",
      siteName: "kurl",
      images: [
        {
          url: `${SITE_URL}/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
  // CollectionPage JSON-LD — explicitly classifies the page as a curated gallery of example
  // profiles. Helps Google differentiate this marketing surface from the dynamic /u/{handle}
  // pages (Person + ProfilePage). Drives "link in bio examples" / "프로필 페이지 사례"
  // queries toward this URL instead of a random user page.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("meta.title"),
    description: t("meta.description"),
    url: `${SITE_URL}/${locale}/showcase`,
    inLanguage: locale,
    isPartOf: { "@type": "WebSite", name: "kurl", url: SITE_URL },
  };

  return (
    <div className="overflow-hidden">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <section className="bg-white dark:bg-slate-950">
        <div className="container max-w-5xl pb-12 pt-14 sm:pb-16 sm:pt-24">
          <div className="hero-stagger max-w-2xl space-y-4">
            <p
              className="text-[13px] font-semibold text-accent-700 dark:text-accent-400"
              style={{ ["--hi" as string]: 0 } as React.CSSProperties}
            >
              {t("eyebrow")}
            </p>
            <h1
              className="text-balance text-headline-lg font-bold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-xl"
              style={{ ["--hi" as string]: 1 } as React.CSSProperties}
            >
              {t("ctaTitle")}
            </h1>
            <p
              className="max-w-xl text-pretty text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 sm:text-[17px]"
              style={{ ["--hi" as string]: 2 } as React.CSSProperties}
            >
              {t("ctaSubhead")}
            </p>
            <div className="pt-3" style={{ ["--hi" as string]: 3 } as React.CSSProperties}>
              <Link
                href="/login?next=/profile/auto"
                className="focus-ring group inline-flex h-11 items-center gap-1.5 rounded-lg bg-accent-700 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-accent-800 dark:bg-accent-500 dark:text-slate-950 dark:hover:bg-accent-400"
              >
                {t("cta")}
                <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        id="showcase-examples"
        className="border-t border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-950 sm:py-16"
      >
        <div className="container mb-10 max-w-5xl">
          <h2 className="text-balance text-headline-sm font-bold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
            {t("title")}
          </h2>
          <p className="mt-3 max-w-xl text-pretty text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
            {t("subhead")}
          </p>
        </div>
        <ProfileShowcase />
      </section>
    </div>
  );
}
