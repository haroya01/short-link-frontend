import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { marketingOg } from "@/lib/marketing-og";
import { Link } from "@/i18n/navigation";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_FRONTEND_URL ?? "https://kurl.me";

/**
 * Long-tail SEO content page targeting "URL 단축 / 숏링크 / 링크 인 바이오 / 명함" queries —
 * the question-and-answer format lines up with how people actually search ("숏링크가 뭐예요"),
 * and FAQPage JSON-LD makes the entries rich-snippet eligible so individual Q&A can show
 * directly in Google results. Cross-linked from {@link AboutPage} + the footer so internal
 * link weight reaches it.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "learn" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: `${SITE_URL}/${locale}/learn` },
    ...marketingOg({
      locale,
      path: "/learn",
      title: t("metaTitle"),
      description: t("metaDescription"),
    }),
  };
}

export default async function LearnPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "learn" });

  const sections = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sections.map((id) => ({
      "@type": "Question",
      name: t(`${id}.q`),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(`${id}.a`),
      },
    })),
  };

  return (
    <article className="container max-w-3xl space-y-10 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <header className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700 dark:text-accent-400">
          {t("eyebrow")}
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">{t("lead")}</p>
      </header>

      {sections.map((id) => (
        <section key={id} className="space-y-2">
          <h2 className="text-xl font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t(`${id}.q`)}</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {t(`${id}.a`)}
          </p>
        </section>
      ))}

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("ctaTitle")}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("ctaSubtitle")}</p>
        </div>
        <Link
          href="/"
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-slate-900 dark:bg-white px-5 py-2 text-sm font-medium text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-slate-200"
        >
          {t("ctaButton")}
        </Link>
      </div>
    </article>
  );
}
