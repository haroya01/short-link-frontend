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

type Notice = {
  type: string;
  actorId?: number | null;
  noteExcerpt?: string | null;
  sourceExcerpt?: string | null;
};

/** The same notices the server reads (RecordBlogNotificationUseCase.othersText): those quoting
 *  someone else's note. Likes and reposts quote the reader's own note, which filters never touch. */
function othersExcerpt(notice: Notice, meId: number | null | undefined): string | null | undefined {
  switch (notice.type) {
    case "NOTE_REPLY":
    case "NOTE_QUOTE":
      return notice.sourceExcerpt;
    case "NOTE_MENTION":
    case "POST_QUOTE":
    case "NOTE_POST":
    case "NOTE_EDIT":
      return notice.noteExcerpt;
    case "NOTE_POLL":
      return notice.actorId != null && notice.actorId === meId ? null : notice.noteExcerpt;
    default:
      return null;
  }
}

export function noticeHidden(
  notice: Notice,
  filters: NoteFilter[],
  meId?: number | null,
): boolean {
  const text = othersExcerpt(notice, meId);
  return !!text && textVerdict(text, filters, "notifications")?.action === "hide";
}
