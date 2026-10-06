import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { NoteQuotes } from "@/modules/notes/components/note-quotes";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; username: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "notes" });
  return { title: t("quotesTitle"), robots: { index: false } };
}

export default async function NoteQuotesPage({ params }: { params: Params }) {
  const { locale, id } = await params;
  const noteId = Number(id);
  if (!Number.isInteger(noteId) || noteId <= 0) notFound();
  const t = await getTranslations({ locale, namespace: "notes" });
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 sm:py-12">
      <h1 className="text-[20px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {t("quotesTitle")}
      </h1>
      <div className="mt-2">
        <NoteQuotes noteId={noteId} />
      </div>
    </main>
  );
}
