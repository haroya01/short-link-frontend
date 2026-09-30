import type { Metadata } from "next";
import { serializeJsonLd } from "@/lib/json-ld";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { linksHref } from "@/lib/host";
import { routing } from "@/i18n/routing";
import { SEO_FAQ_TITLE, SEO_PAGES, getSeoContent, getSeoPage, seoContentLocale } from "@/modules/marketing/seo-landing";

export const revalidate = 3600;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_FRONTEND_URL ?? "https://kurl.me";

export function generateStaticParams() {
  return SEO_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = getSeoPage(slug);
  if (!page) return {};
  const c = getSeoContent(page, locale);
  const url = `${SITE_URL}/${locale}/use/${slug}`;
  return {
    title: c.title,
    description: c.description,
    // These pages are generated for every locale (generateStaticParams), so each must point crawlers
    // at its sibling-locale variants — without hreflang the locales competed as near-duplicates.
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}/use/${slug}`])),
        "x-default": `${SITE_URL}/${routing.defaultLocale}/use/${slug}`,
      },
    },
    openGraph: { title: c.title, description: c.description, url, type: "website", siteName: "kurl" },
    twitter: { card: "summary", title: c.title, description: c.description },
  };
}

export default async function SeoLandingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const page = getSeoPage(slug);
  if (!page) notFound();
  const c = getSeoContent(page, locale);
  const seoLocale = seoContentLocale(page, locale);
  const ctaHref = linksHref(`/?ref=seo-${slug}`);

  // FAQPage structured data → eligible for FAQ rich results in Google.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <header className="max-w-2xl">
        <h1 className="text-balance text-headline-md font-bold leading-[1.15] tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-lg">
          {c.title}
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-slate-600 dark:text-slate-300">{c.intro}</p>
        <a
          href={ctaHref}
          className="focus-ring mt-8 inline-flex items-center gap-2 rounded-lg bg-accent-700 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-accent-800"
        >
          {c.cta}
          <ArrowRight className="h-4 w-4" />
        </a>
      </header>

      <dl className="mt-16 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {c.features.map((f) => (
          <div key={f.title} className="grid gap-x-8 gap-y-1 py-5 sm:grid-cols-[13rem_1fr]">
            <dt className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{f.title}</dt>
            <dd className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{f.body}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-16">
        <h2 className="text-headline-xs font-bold tracking-headline text-slate-900 dark:text-slate-100">
          {SEO_FAQ_TITLE[seoLocale]}
        </h2>
        <dl className="mt-6 space-y-6">
          {c.faq.map((f) => (
            <div key={f.q}>
              <dt className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{f.q}</dt>
              <dd className="mt-1.5 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-16 border-t border-slate-200 pt-10 dark:border-slate-800">
        <a
          href={ctaHref}
          className="focus-ring inline-flex items-center gap-2 rounded-lg bg-accent-700 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-accent-800"
        >
          {c.cta}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </a>
      </div>
    </main>
  );
}
