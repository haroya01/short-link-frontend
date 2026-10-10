"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { Repeat2 } from "lucide-react";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { listAuthorReposts, type NoteFeed } from "@/modules/notes/api/notes";
import { NoteList } from "./note-list";

export function AuthorReposts({ username, initial }: { username: string; initial: NoteFeed | null }) {
  const t = useTranslations("notes");
  const load = useCallback((page: number) => listAuthorReposts(username, page), [username]);
  return (
    <NoteList
      load={load}
      initial={initial}
      repostedBy={username}
      filterContext="account"
      empty={<BlogEmpty icon={Repeat2} title={t("emptyReposts")} />}
    />
  );
}
