import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { marketingOg } from "@/lib/marketing-og";
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
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: t("title"),
    description: t("lead"),
    alternates: { canonical: `${SITE_URL}/${locale}/about` },
    ...marketingOg({ locale, path: "/about", title: t("title"), description: t("lead") }),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return (
    <article className="container max-w-3xl space-y-8 py-16">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("title")}</h1>
        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">{t("lead")}</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("section1Title")}</h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t("section1Body")}</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("section2Title")}</h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t("section2Body")}</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("section3Title")}</h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t("section3Body")}</p>
      </section>

      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-md bg-slate-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-slate-200"
      >
        {t("ctaShorten")}
      </Link>
    </article>
  );
}
