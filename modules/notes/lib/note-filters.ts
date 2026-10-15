"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth";
import {
  deleteNoteFilter,
  listNoteFilters,
  saveNoteFilter,
  type NoteFilter,
  type NoteFilterDraft,
} from "@/modules/notes/api/notes";

export { noteVerdict, noticeHidden, textVerdict, type FilterVerdict } from "./note-filter-match";

let current: NoteFilter[] = [];
let loadedFor: number | null = null;
const listeners = new Set<() => void>();

function publish(next: NoteFilter[]) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The signed-in reader's filters, fetched once per account and shared by every list on the page. */
export function useNoteFilters(): NoteFilter[] {
  const { authenticated, me } = useAuth();
  const userId = authenticated ? (me?.id ?? null) : null;
  useEffect(() => {
    if (userId === null) {
      loadedFor = null;
      if (current.length > 0) publish([]);
      return;
    }
    if (loadedFor === userId) return;
    loadedFor = userId;
    listNoteFilters()
      .then(publish)
      .catch(() => {
        loadedFor = null;
      });
  }, [userId]);
  return useSyncExternalStore(subscribe, () => current, () => current);
}

export async function saveFilter(draft: NoteFilterDraft, id: number | null) {
  const saved = await saveNoteFilter(draft, id);
  publish(id === null ? [saved, ...current] : current.map((f) => (f.id === id ? saved : f)));
}

export async function removeFilter(id: number) {
  await deleteNoteFilter(id);
  publish(current.filter((f) => f.id !== id));
}
