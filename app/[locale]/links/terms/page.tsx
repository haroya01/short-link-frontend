import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { marketingOg } from "@/lib/marketing-og";

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
  const t = await getTranslations({ locale, namespace: "terms" });
  return {
    title: t("title"),
    description: t("intro"),
    alternates: { canonical: `${SITE_URL}/${locale}/terms` },
    ...marketingOg({ locale, path: "/terms", title: t("title"), description: t("intro") }),
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  const sections = t.raw("sections") as { h: string; p: string }[];
  return (
    <article className="container max-w-3xl space-y-8 py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("title")}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("updatedAt")}</p>
      </header>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t("intro")}</p>
      {sections.map((s) => (
        <section key={s.h} className="space-y-2">
          <h2 className="text-lg font-semibold tracking-headline text-slate-900 dark:text-slate-100">{s.h}</h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{s.p}</p>
        </section>
      ))}
    </article>
  );
}
