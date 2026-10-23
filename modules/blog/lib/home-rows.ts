import type { HomeItem, HomePost } from "@/modules/blog/api/home-feed";
import type { Note } from "@/modules/notes/api/notes";
import type { RemoteItem } from "@/modules/notes/api/remote-trending";
import type { FilterVerdict } from "@/modules/notes/lib/note-filter-match";
import type { RemoteRow } from "@/modules/notes/lib/remote-rows";

export type HomeRow =
  | { kind: "note"; note: Note; filteredBy?: string[] }
  | { kind: "post"; post: HomePost }
  | { kind: "remote"; row: RemoteRow };

export type HomeJudge = {
  note: (note: Note) => FilterVerdict | null;
  remote: (entry: RemoteItem) => FilterVerdict | null;
  blocked: ReadonlySet<string>;
};

export function homeRows(items: readonly HomeItem[], judge: HomeJudge): HomeRow[] {
  const notes = new Set<number>();
  const posts = new Set<number>();
  const uris = new Set<string>();
  const rows: HomeRow[] = [];
  const warned = (verdict: FilterVerdict | null) => (verdict?.action === "warn" ? verdict.phrases : undefined);
  for (const item of items) {
    if (item.kind === "post") {
      if (posts.has(item.post.id) || judge.blocked.has(item.post.author.username)) continue;
      posts.add(item.post.id);
      rows.push(item);
      continue;
    }
    if (item.kind === "note") {
      if (notes.has(item.note.id)) continue;
      notes.add(item.note.id);
      if (judge.blocked.has(item.note.author.username)) continue;
      const verdict = judge.note(item.note);
      if (verdict?.action === "hide") continue;
      rows.push({ kind: "note", note: item.note, filteredBy: warned(verdict) });
      continue;
    }
    const entry = item.remote;
    const uri = entry.kind === "pool" ? entry.item.uri : (entry.uri ?? null);
    if (uri && uris.has(uri)) continue;
    if (entry.kind === "kept") {
      if (notes.has(entry.note.id)) continue;
      notes.add(entry.note.id);
      if (judge.blocked.has(entry.note.author.username)) continue;
    }
    if (uri) uris.add(uri);
    const verdict = judge.remote(entry);
    if (verdict?.action === "hide") continue;
    const filteredBy = warned(verdict);
    rows.push({
      kind: "remote",
      row:
        entry.kind === "pool"
          ? { kind: "pool", item: entry.item, uri: entry.item.uri, filteredBy }
          : { kind: "kept", note: entry.note, uri, filteredBy },
    });
  }
  return rows;
}
