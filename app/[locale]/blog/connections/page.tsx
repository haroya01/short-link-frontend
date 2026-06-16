import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DiscoverConnections } from "@/modules/blog/components/discover-connections";

// The discover feed is the viewer's follow graph — fetched client-side with their token.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "collections" });
  return { title: t("discoverMetaTitle"), robots: { index: false, follow: true } };
}

export default async function ConnectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "collections" });
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-8">
        <h1 className="text-headline-sm font-bold tracking-headline text-slate-900 dark:text-slate-100">
          {t("discoverTitle")}
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t("discoverSubtitle")}
        </p>
      </header>
      <DiscoverConnections locale={locale} />
    </main>
  );
}
