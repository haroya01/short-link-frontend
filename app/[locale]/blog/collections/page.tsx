import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MyCollectionsList } from "@/modules/blog/components/my-collections-list";

// The list is the viewer's own collections (private included) — fetched client-side with their token.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "collections" });
  return { title: t("myCollectionsMetaTitle"), robots: { index: false, follow: true } };
}

export default async function MyCollectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "collections" });
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-6">
        <h1 className="text-headline-sm font-bold tracking-headline text-slate-900 dark:text-slate-100">
          {t("myCollectionsTitle")}
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t("myCollectionsSubtitle")}
        </p>
      </header>
      <MyCollectionsList />
    </main>
  );
}
