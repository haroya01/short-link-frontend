import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { linksHref } from "@/lib/host";
import { SEO_PAGES, getSeoContent, getSeoPage } from "@/modules/marketing/seo-landing";

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
    alternates: { canonical: url },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="max-w-2xl">
        <h1 className="text-balance text-headline-md font-bold leading-[1.15] tracking-headline text-slate-900 sm:text-headline-lg">
          {c.title}
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-slate-600">{c.intro}</p>
        <a
          href={ctaHref}
          className="focus-ring mt-8 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(5,150,105,0.45)] transition-colors hover:bg-accent-700"
        >
          {c.cta}
          <ArrowRight className="h-4 w-4" />
        </a>
      </header>

      <ul className="mt-16 grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {c.features.map((f) => (
          <li key={f.title} className="flex gap-3">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-50 text-accent-600">
              <Check className="h-3.5 w-3.5" />
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-slate-900">{f.title}</span>
              <span className="mt-1 block text-[14px] leading-relaxed text-slate-600">{f.body}</span>
            </span>
          </li>
        ))}
      </ul>

      <section className="mt-16 border-t border-slate-200 pt-10">
        <h2 className="text-headline-xs font-bold tracking-headline text-slate-900">FAQ</h2>
        <dl className="mt-6 space-y-6">
          {c.faq.map((f) => (
            <div key={f.q}>
              <dt className="text-[15px] font-semibold text-slate-900">{f.q}</dt>
              <dd className="mt-1.5 text-[14px] leading-relaxed text-slate-600">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-16 rounded-2xl bg-slate-50 px-6 py-10 text-center ring-1 ring-slate-200/70">
        <a
          href={ctaHref}
          className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent-600 px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(5,150,105,0.45)] transition-colors hover:bg-accent-700"
        >
          {c.cta}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </main>
  );
}
