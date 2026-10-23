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
    slot = i + MIX_EVERY;
    wanted += MIX_TAKE;
    for (let k = 0; k < MIX_TAKE && next < remote.length; k += 1) {
      rows.push({ kind: "remote", item: remote[next++], tail: false });
    }
  });
  if (localDone) while (next < remote.length) rows.push({ kind: "remote", item: remote[next++], tail: true });
  return { rows, wanted: localDone ? 0 : wanted };
}

export function remoteBesides(rows: readonly RemoteRow[], localNotes: ReadonlySet<number>): RemoteRow[] {
  return rows.filter((row) => row.kind === "pool" || !localNotes.has(row.note.id));
}

export type PullNotice = "newRows" | "nothingNew" | "caughtUp" | "failed";

export function pullNotice(
  before: ReadonlySet<string>,
  after: readonly string[],
  failed: { own: boolean; remote: boolean },
): PullNotice {
  if (after.some((key) => !before.has(key))) return "newRows";
  if (failed.own || failed.remote) return "failed";
  return after.length === 0 ? "caughtUp" : "nothingNew";
}
