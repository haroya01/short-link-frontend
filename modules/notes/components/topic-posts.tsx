"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/common/error-state";
import type { Note } from "@/modules/notes/api/notes";
import type { RemoteNotes } from "@/modules/notes/lib/use-remote-trending";
import { NoteFeedRow, NoteListSkeleton } from "./note-list";
import { RemoteMore, useRemoteRows } from "./remote-feed";
import { TrendingNoteCard } from "./remote-trending";

export function TopicPosts({ notes, empty, above }: { notes: RemoteNotes; empty: ReactNode; above?: ReactNode }) {
  const t = useTranslations("notes");
  const rowsOf = useRemoteRows();

  if (notes.state === "loading") {
    return (
      <>
        {above}
        <NoteListSkeleton />
      </>
    );
  }
  if (notes.state === "failed") return <ErrorState title={t("loadFailed")} onRetry={notes.retry} />;

  const rows = rowsOf(notes.pages);
  return (
    <div data-testid="topic-posts">
      {above}
      {rows.length === 0 && !notes.hasMore ? (
        empty
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) =>
            row.kind === "pool" ? (
              <div key={`pool-${row.uri}`} data-remote-uri={row.uri}>
                <TrendingNoteCard item={row.item} filteredBy={row.filteredBy} trending={false} />
              </div>
            ) : (
              <KeptRow key={`kept-${row.note.id}`} note={row.note} filteredBy={row.filteredBy} />
            ),
          )}
        </div>
      )}
      <RemoteMore notes={notes} />
    </div>
  );
}

function KeptRow({ note, filteredBy }: { note: Note; filteredBy?: string[] }) {
  const [current, setCurrent] = useState(note);
  const [removed, setRemoved] = useState(false);
  if (removed) return null;
  return (
    <NoteFeedRow
      note={current}
      repostedBy={current.repostedBy?.username}
      filteredBy={filteredBy}
      onReplace={setCurrent}
      onRemove={() => setRemoved(true)}
    />
  );
}
