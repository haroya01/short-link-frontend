"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { listTaggedNotes } from "@/modules/notes/api/notes";
import { NoteList } from "./note-list";

export function TaggedNotes({ tag }: { tag: string }) {
  const t = useTranslations("notes");
  const load = useCallback((page: number) => listTaggedNotes(tag, page), [tag]);
  return (
    <NoteList
      key={tag}
      load={load}
      filterContext="public"
      empty={<BlogEmpty title={t("emptyTag")} />}
    />
  );
}
