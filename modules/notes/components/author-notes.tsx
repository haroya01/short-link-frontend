"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { blogCta } from "@/modules/blog/components/blog-cta";
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
      showsPin
      filterContext="account"
      empty={
        <BlogEmpty
          title={t("emptyAuthor")}
          action={
            own ? (
              <a
                href={blogHref("/notes")}
                className={blogCta({ variant: "text" })}
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
