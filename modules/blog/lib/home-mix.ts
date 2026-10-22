import type { RemoteItem } from "@/modules/notes/api/remote-trending";
import type { RemoteRow } from "@/modules/notes/lib/remote-rows";

const MIX_EVERY = 5;
const MIX_TAKE = 2;

export type Mixed<L, R> = { kind: "local"; item: L } | { kind: "remote"; item: R; tail: boolean };

export function mixHome<L, R>(
  local: readonly L[],
  remote: readonly R[],
  localDone: boolean,
  cards: ReadonlySet<number> = new Set(),
): { rows: Mixed<L, R>[]; wanted: number } {
  const rows: Mixed<L, R>[] = [];
  const crowded = (at: number) => cards.has(at - 1) || cards.has(at) || cards.has(at + 1);
  let next = 0;
  let slot = MIX_EVERY - 1;
  let wanted = 0;
  local.forEach((item, i) => {
    rows.push({ kind: "local", item });
    if (i !== slot) return;
    if (crowded(i)) {
      slot = i + 1;
      return;
    }
    if (i === local.length - 1) return;
    slot = i + MIX_EVERY;
    wanted += MIX_TAKE;
    for (let k = 0; k < MIX_TAKE && next < remote.length; k += 1) {
      rows.push({ kind: "remote", item: remote[next++], tail: false });
    }
  });
  if (localDone) while (next < remote.length) rows.push({ kind: "remote", item: remote[next++], tail: true });
  return { rows, wanted: localDone ? 0 : wanted };
}

export function remoteBesides(
  rows: readonly RemoteRow[],
  notes: ReadonlySet<number>,
  uris: ReadonlySet<string> = new Set(),
): RemoteRow[] {
  return rows.filter((row) =>
    row.kind === "pool" ? !uris.has(row.uri) : !notes.has(row.note.id) && !(row.uri && uris.has(row.uri)),
  );
}

export type KnownRemote = { uris: Set<string>; notes: Set<number> };

export function knownRemote(items: readonly RemoteItem[]): KnownRemote {
  const known: KnownRemote = { uris: new Set(), notes: new Set() };
  for (const entry of items) {
    if (entry.kind === "pool") known.uris.add(entry.item.uri);
    else {
      known.notes.add(entry.note.id);
      if (entry.uri) known.uris.add(entry.uri);
    }
  }
  return known;
}

export function freshRemote(items: readonly RemoteItem[], known: KnownRemote, since: number): RemoteItem[] {
  return items.filter((entry) => {
    const written = Date.parse(entry.kind === "pool" ? entry.item.createdAt : entry.note.createdAt);
    if (!(written > since)) return false;
    if (entry.kind === "pool") return !known.uris.has(entry.item.uri);
    return !known.notes.has(entry.note.id) && !(entry.uri && known.uris.has(entry.uri));
  });
}
