import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CollectionDetailView } from "@/modules/blog/components/collection-detail-view";

// A collection can be private/owner-gated, so detail is fetched client-side (with the viewer's token).
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "collections" });
  return { title: t("metaTitle"), robots: { index: false, follow: true } };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const numId = Number(id);
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <CollectionDetailView collectionId={Number.isFinite(numId) ? numId : 0} locale={locale} />
    </main>
  );
}
