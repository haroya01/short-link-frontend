"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/common/empty-state";
import { searchNotes } from "@/modules/notes/api/notes";
import { NoteList } from "./note-list";

export function SearchedNotes({ query }: { query: string }) {
  const t = useTranslations("notes");
  const load = useCallback((page: number) => searchNotes(query, page), [query]);
  return (
    <NoteList
      key={query}
      load={load}
      filterContext="public"
      empty={<EmptyState title={t("searchNotesEmpty", { q: query })} className="mt-8" />}
    />
  );
}
