import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { fetchNoteThread } from "@/modules/notes/api/notes";
import { NoteThreadView } from "@/modules/notes/components/note-thread";

export const dynamic = "force-dynamic";

// A note from another server: its own page is on that server, so this copy stays out of search.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function RemoteNotePage({
  params,
}: {
  params: Promise<{ locale: string; id: string; noteId: string }>;
}) {
  const { locale, id, noteId } = await params;
  setRequestLocale(locale);
  const note = Number(noteId);
  if (!Number.isInteger(note) || note <= 0) notFound();
  const result = await fetchNoteThread(note);
  if (!result.ok) {
    if (result.status === "error") throw new Error(`note fetch failed: ${note}`);
    notFound();
  }
  if (String(result.data.note.author.remoteId ?? "") !== id) notFound();
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 sm:py-12">
      <NoteThreadView initial={result.data} />
    </div>
  );
}
