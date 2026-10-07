import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LinkedNotes } from "@/modules/notes/components/linked-notes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "notes" });
  return { title: `${t("linkTitle")} · kurl log`, robots: { index: false, follow: false } };
}

export default async function LinkedNotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ url?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { url } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-24 sm:px-6 sm:py-8">
      <LinkedNotes url={url ?? ""} />
    </div>
  );
}
