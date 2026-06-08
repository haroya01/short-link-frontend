import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

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
  const t = await getTranslations({ locale, namespace: "privacy" });
  return {
    title: t("title"),
    alternates: { canonical: `${SITE_URL}/${locale}/privacy` },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  const sections = [
    { h: t("h1"), p: t("p2") },
    { h: t("h2"), p: t("p3") },
    { h: t("h3"), p: t("p4") },
    { h: t("h4"), p: t("p5") },
    { h: t("h5"), p: t("p6") },
    { h: t("h6"), p: t("p7") },
    { h: t("h7"), p: t("p8") },
    { h: t("h8"), p: t("p9") },
  ];
  return (
    <article className="container max-w-3xl space-y-8 py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("title")}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("updatedAt")}</p>
      </header>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t("p1")}</p>
      {sections.map((s) => (
        <section key={s.h} className="space-y-2">
          <h2 className="text-lg font-semibold tracking-headline text-slate-900 dark:text-slate-100">{s.h}</h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{s.p}</p>
        </section>
      ))}
    </article>
  );
}
