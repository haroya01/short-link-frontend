import { blogPath } from "@/lib/host";
import { authorHref } from "@/modules/blog/lib/author-href";
import type { Note } from "@/modules/notes/api/notes";

export function noteHref(note: Pick<Note, "id" | "author">, locale: string): string {
  if (note.author.remoteId) return blogPath(`/remote/${note.author.remoteId}/notes/${note.id}`);
  return authorHref(note.author.username, locale, `notes/${note.id}`);
}

export function openNote(note: Pick<Note, "id" | "author">, locale: string, push: (href: string) => void) {
  const href = noteHref(note, locale);
  if (/^https?:\/\//.test(href)) window.location.assign(href);
  else push(href);
}
