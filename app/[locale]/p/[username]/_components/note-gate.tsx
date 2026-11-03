"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { ErrorState } from "@/components/common/error-state";
import { authorHref } from "@/modules/blog/lib/author-href";
import { getNoteThread, type NoteThread } from "@/modules/notes/api/notes";
import { NoteThreadView } from "@/modules/notes/components/note-thread";

type Read = { id: number; thread: NoteThread | null; failed: boolean };

export function NoteGate({ children }: { children: ReactNode }) {
  const t = useTranslations("notes");
  const locale = useLocale();
  const router = useRouter();
  const params = useParams<{ username: string; id: string }>();
  const { ready, authenticated } = useAuth();
  const [read, setRead] = useState<Read | null>(null);
  const [attempt, setAttempt] = useState(0);
  const noteId = Number(params.id);
  const valid = Number.isInteger(noteId) && noteId > 0;
  const signedIn = ready && authenticated && valid;

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    getNoteThread(noteId).then(
      (thread) => {
        if (live) setRead({ id: noteId, thread, failed: false });
      },
      (error) => {
        const missing = error instanceof ApiError && error.status === 404;
        if (live) setRead({ id: noteId, thread: null, failed: !missing });
      },
    );
    return () => {
      live = false;
    };
  }, [signedIn, noteId, attempt]);

  const current = signedIn && read?.id === noteId ? read : null;
  const thread = current?.thread ?? null;
  const author = thread?.note.author.username;

  useEffect(() => {
    if (!thread || !author) return;
    if (author !== params.username) {
      router.replace(authorHref(author, locale, `notes/${thread.note.id}`));
      return;
    }
    document.title = t("noteBy", { username: author });
  }, [thread, author, params.username, locale, router, t]);

  if (!ready || (signedIn && !current)) return <main aria-busy className="min-h-[60vh]" />;
  if (current?.failed) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 sm:py-12">
        <ErrorState
          onRetry={() => {
            setRead(null);
            setAttempt((n) => n + 1);
          }}
        />
      </main>
    );
  }
  if (!thread) return <>{children}</>;
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 sm:py-12">
      <NoteThreadView key={thread.note.id} initial={thread} />
    </main>
  );
}
