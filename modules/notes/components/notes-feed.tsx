"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/common/empty-state";
import { listEveryoneNotes, type Note, type QuotedPost } from "@/modules/notes/api/notes";
import { NoteComposer, NoteSignInRow } from "./note-composer";
import { NoteList } from "./note-list";

function quoteFromParams(params: URLSearchParams): QuotedPost | null {
  const id = Number(params.get("quote"));
  const title = params.get("quoteTitle");
  const slug = params.get("quoteSlug");
  const authorUsername = params.get("quoteAuthor");
  if (!Number.isInteger(id) || id <= 0 || !title || !slug || !authorUsername) return null;
  return { id, title, slug, authorUsername };
}

export function NotesFeed() {
  const t = useTranslations("notes");
  const params = useSearchParams();
  const { ready, authenticated } = useAuth();
  const [quote, setQuote] = useState<QuotedPost | null>(() => quoteFromParams(params));
  const [posted, setPosted] = useState<Note[]>([]);
  const load = useCallback((page: number) => listEveryoneNotes(page), []);

  return (
    <div>
      <div className="border-b border-slate-100 dark:border-slate-800">
        {ready && authenticated ? (
          <NoteComposer
            quote={quote}
            onClearQuote={() => setQuote(null)}
            onCreated={(note) => setPosted((current) => [note, ...current])}
          />
        ) : (
          <NoteSignInRow label={t("loginToWrite")} placeholder={t("composerPlaceholder")} />
        )}
      </div>
      <NoteList
        load={load}
        prepend={posted}
        empty={<EmptyState title={t("emptyAuthor")} className="mt-8" />}
      />
    </div>
  );
}
