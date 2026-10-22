import type { RemoteRow } from "@/modules/notes/lib/remote-rows";

const MIX_EVERY = 5;
const MIX_TAKE = 2;

export type Mixed<L, R> = { kind: "local"; item: L } | { kind: "remote"; item: R; tail: boolean };

export function mixHome<L, R>(
  local: readonly L[],
  remote: readonly R[],
  localDone: boolean,
): { rows: Mixed<L, R>[]; wanted: number } {
  const rows: Mixed<L, R>[] = [];
  let next = 0;
  local.forEach((item, i) => {
    rows.push({ kind: "local", item });
    const count = i + 1;
    if (count % MIX_EVERY !== 0 || count === local.length) return;
    for (let k = 0; k < MIX_TAKE && next < remote.length; k += 1) {
      rows.push({ kind: "remote", item: remote[next++], tail: false });
    }
  });
  if (localDone) while (next < remote.length) rows.push({ kind: "remote", item: remote[next++], tail: true });
  const wanted = localDone ? 0 : MIX_TAKE * Math.floor(Math.max(local.length - 1, 0) / MIX_EVERY);
  return { rows, wanted };
}

export function remoteBesides(rows: readonly RemoteRow[], localNotes: ReadonlySet<number>): RemoteRow[] {
  return rows.filter((row) => row.kind === "pool" || !localNotes.has(row.note.id));
}
