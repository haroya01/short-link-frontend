import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button-variants";
import { serializeJsonLd } from "@/lib/json-ld";
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
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />
      <header className="space-y-3">
        <h1 className="text-balance text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
          {t("title")}
        </h1>
        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">{t("lead")}</p>
      </header>

      {sections.map((id) => (
        <section key={id} className="space-y-2">
          <h2 className="text-headline-xs font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t(`${id}.q`)}</h2>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
            {t(`${id}.a`)}
          </p>
        </section>
      ))}

      <div className="border-t border-slate-200 pt-10 dark:border-slate-800">
        <Link href="/" className={buttonVariants({ variant: "accent", size: "lg" })}>
          {t("ctaButton")}
        </Link>
      </div>
    </article>
  );
}
