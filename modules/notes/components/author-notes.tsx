"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { EmptyState } from "@/components/common/empty-state";
import { listAuthorNotes, type NoteFeed } from "@/modules/notes/api/notes";
import { NoteList } from "./note-list";

export function AuthorNotes({ username, initial }: { username: string; initial: NoteFeed | null }) {
  const t = useTranslations("notes");
  const { me } = useAuth();
  const load = useCallback((page: number) => listAuthorNotes(username, page), [username]);
  const own = me?.username === username;
  return (
    <NoteList
      load={load}
      initial={initial}
      empty={
        <EmptyState
          title={t("emptyAuthor")}
          className="mt-4"
          action={
            own ? (
              <a
                href={blogHref("/notes")}
                className="focus-ring rounded-lg bg-accent-700 px-4 py-2 text-[14px] font-medium text-white hover:bg-accent-800"
              >
                {t("writeFirst")}
              </a>
            ) : undefined
          }
        />
      }
    />
  );
}
