"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/common/empty-state";
import { listNoteQuotes } from "@/modules/notes/api/notes";
import { NoteList } from "./note-list";

export function NoteQuotes({ noteId }: { noteId: number }) {
  const t = useTranslations("notes");
  const load = useCallback((page: number) => listNoteQuotes(noteId, page), [noteId]);
  return (
    <NoteList load={load} filterContext="public" empty={<EmptyState title={t("quotesEmpty")} className="mt-8" />} />
  );
}
