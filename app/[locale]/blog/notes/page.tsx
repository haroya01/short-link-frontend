"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/common/empty-state";
import {
  listAuthorNotes,
  listEveryoneNotes,
  listFollowingNotes,
  type Note,
  type QuotedPost,
} from "@/modules/notes/api/notes";
import { NoteComposer } from "@/modules/notes/components/note-composer";
import { NoteList } from "@/modules/notes/components/note-list";

export default function NotesPage() {
  return (
    <Suspense fallback={null}>
      <Notes />
    </Suspense>
  );
}

function quoteFromParams(params: URLSearchParams): QuotedPost | null {
  const id = Number(params.get("quote"));
  const title = params.get("quoteTitle");
  const slug = params.get("quoteSlug");
  const authorUsername = params.get("quoteAuthor");
  if (!Number.isInteger(id) || id <= 0 || !title || !slug || !authorUsername) return null;
  return { id, title, slug, authorUsername };
}

type Tab = "everyone" | "following" | "mine";

function Notes() {
  const t = useTranslations("notes");
  const params = useSearchParams();
  const { ready, authenticated, me } = useAuth();
  const [tab, setTab] = useState<Tab>("everyone");
  const [quote, setQuote] = useState<QuotedPost | null>(() => quoteFromParams(params));
  const [posted, setPosted] = useState<Note[]>([]);

  const username = me?.username ?? "";
  const loadEveryone = useCallback((page: number) => listEveryoneNotes(page), []);
  const loadFollowing = useCallback((page: number) => listFollowingNotes(page), []);
  const loadMine = useCallback((page: number) => listAuthorNotes(username, page), [username]);
  const tabs = useMemo(
    () => [
      { key: "everyone" as const, label: t("tabEveryone") },
      { key: "following" as const, label: t("tabFollowing") },
      { key: "mine" as const, label: t("tabMine") },
    ],
    [t],
  );

  if (!ready || !authenticated) return null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
        {t("title")}
      </h1>

      <div className="mt-6">
        <NoteComposer
          quote={quote}
          onClearQuote={() => setQuote(null)}
          onCreated={(note) => setPosted((current) => [note, ...current])}
        />
      </div>

      <div role="tablist" className="mt-8 flex gap-6 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "focus-ring -mb-px border-b-2 px-0.5 pb-2.5 text-[14px] font-medium transition-colors",
              tab === item.key
                ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "everyone" ? (
          <NoteList
            key="everyone"
            load={loadEveryone}
            prepend={posted}
            empty={<EmptyState title={t("emptyAuthor")} className="mt-8" />}
          />
        ) : tab === "following" ? (
          <NoteList
            key="following"
            load={loadFollowing}
            prepend={posted}
            empty={<EmptyState title={t("emptyFollowing")} className="mt-8" />}
          />
        ) : (
          <NoteList
            key="mine"
            load={loadMine}
            prepend={posted}
            empty={<EmptyState title={t("emptyMine")} className="mt-8" />}
          />
        )}
      </div>
    </main>
  );
}
