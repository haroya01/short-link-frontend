import type { Note } from "@/modules/notes/api/notes";
import type { RemoteItem, RemoteNotesPage, TrendingNote } from "@/modules/notes/api/remote-trending";
import type { FilterVerdict } from "./note-filter-match";

export type RemoteRow = (
  | { kind: "pool"; item: TrendingNote; uri: string }
  | { kind: "kept"; note: Note; uri: string | null }
) & { filteredBy?: string[]; seenStart?: boolean };

export function remoteRows(
  pages: RemoteNotesPage[],
  judge: (entry: RemoteItem) => FilterVerdict | null,
  blocked: ReadonlySet<string>,
): RemoteRow[] {
  const uris = new Set<string>();
  const ids = new Set<number>();
  const rows: RemoteRow[] = [];
  let seen = false;
  let divided = false;
  for (const page of pages) {
    page.items.forEach((entry, index) => {
      if (index === page.seenFrom) seen = true;
      if (entry.kind === "pool") {
        if (uris.has(entry.item.uri)) return;
        uris.add(entry.item.uri);
      } else {
        if (ids.has(entry.note.id) || blocked.has(entry.note.author.username)) return;
        ids.add(entry.note.id);
      }
      const verdict = judge(entry);
      if (verdict?.action === "hide") return;
      const filteredBy = verdict?.action === "warn" ? verdict.phrases : undefined;
      const seenStart = seen && !divided;
      if (seenStart) divided = true;
      rows.push(
        entry.kind === "pool"
          ? { kind: "pool", item: entry.item, uri: entry.item.uri, filteredBy, seenStart }
          : { kind: "kept", note: entry.note, uri: entry.uri ?? null, filteredBy, seenStart },
      );
    });
    if (page.seenFrom !== undefined && page.seenFrom >= page.items.length) seen = true;
  }
  return rows;
}
