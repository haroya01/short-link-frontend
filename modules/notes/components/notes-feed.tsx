"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/common/empty-state";
import { listEveryoneNotes, type Note, type QuotedPost } from "@/modules/notes/api/notes";
import { NoteComposer } from "./note-composer";
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
  const { ready, authenticated, signInWithGoogle } = useAuth();
  const [quote, setQuote] = useState<QuotedPost | null>(() => quoteFromParams(params));
  const [posted, setPosted] = useState<Note[]>([]);
  const load = useCallback((page: number) => listEveryoneNotes(page), []);

  return (
    <div>
      {ready && authenticated ? (
        <NoteComposer
          quote={quote}
          onClearQuote={() => setQuote(null)}
          onCreated={(note) => setPosted((current) => [note, ...current])}
        />
      ) : (
        <button
          type="button"
          onClick={signInWithGoogle}
          className="flex w-full items-center rounded-2xl border border-slate-200 px-4 py-3.5 text-left text-[15px] text-slate-500 transition-colors hover:border-accent-400 focus-ring dark:border-slate-800 dark:text-slate-400"
        >
          {t("loginToWrite")}
        </button>
      )}
      <div className="mt-4">
        <NoteList
          load={load}
          prepend={posted}
          empty={<EmptyState title={t("emptyAuthor")} className="mt-8" />}
        />
      </div>
    </div>
  );
}
