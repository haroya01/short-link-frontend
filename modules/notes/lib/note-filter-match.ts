import type { Note, NoteFilter, NoteFilterContext } from "@/modules/notes/api/notes";

export type FilterVerdict = { action: "hide" } | { action: "warn"; phrases: string[] };

function matches(filter: NoteFilter, text: string): boolean {
  const escaped = filter.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const source = filter.wholeWord ? `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])` : escaped;
  return new RegExp(source, "iu").test(text);
}

export function textVerdict(
  text: string,
  filters: NoteFilter[],
  context: NoteFilterContext,
  now = Date.now(),
): FilterVerdict | null {
  const warned: string[] = [];
  for (const filter of filters) {
    if (!filter.context.includes(context)) continue;
    if (filter.expiresAt && new Date(filter.expiresAt).getTime() <= now) continue;
    if (!matches(filter, text)) continue;
    if (filter.action === "hide") return { action: "hide" };
    warned.push(filter.phrase);
  }
  return warned.length ? { action: "warn", phrases: warned } : null;
}

/** As on Mastodon, a reader's own notes are never filtered. The body, warning, poll options and
 *  image descriptions are what a filter reads. */
export function noteVerdict(
  note: Note,
  filters: NoteFilter[],
  context: NoteFilterContext | undefined,
  meId: number | null | undefined,
): FilterVerdict | null {
  if (!context || filters.length === 0 || note.author.id === meId) return null;
  const text = [
    note.body,
    note.contentWarning ?? "",
    ...(note.poll?.options.map((o) => o.title) ?? []),
    ...note.media.map((m) => m.altText ?? ""),
  ].join("\n");
  return textVerdict(text, filters, context);
}

/** Notices carry an excerpt of someone else's note only for replies, quotes and mentions; likes and
 *  reposts quote the reader's own note, which filters never touch. */
export function noticeHidden(
  notice: { type: string; noteExcerpt?: string | null; sourceExcerpt?: string | null },
  filters: NoteFilter[],
): boolean {
  const text =
    notice.type === "NOTE_REPLY" || notice.type === "NOTE_QUOTE"
      ? notice.sourceExcerpt
      : notice.type === "NOTE_MENTION"
        ? notice.noteExcerpt
        : null;
  return !!text && textVerdict(text, filters, "notifications")?.action === "hide";
}
