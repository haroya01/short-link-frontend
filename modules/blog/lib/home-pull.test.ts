import { describe, expect, it } from "vitest";
import type { Note } from "@/modules/notes/api/notes";
import type { RemoteItem, TrendingNote } from "@/modules/notes/api/remote-trending";
import { remoteRows } from "@/modules/notes/lib/remote-rows";
import { mixHome, pullNotice, remoteBesides } from "./home-mix";
import vectors from "./vectors/seen-rules.json";

type OwnItem = { key: string; kind: string; id: number };
type RemoteVector = { key: string; uri: string | null; keptNoteId: number | null };
type Result<T> = { result: "ok"; items: T[]; done?: boolean } | { result: "failed" };
type PullCase = {
  id: string;
  name: string;
  before: { own: OwnItem[]; remote: RemoteVector[]; ownDone: boolean };
  own: Result<OwnItem>;
  remote: Result<RemoteVector>;
  notice: string;
};

const RULED_AFTER_V1: Record<string, string> = { "pull-013": "failed" };

function laidOut(own: OwnItem[], remote: RemoteVector[], done: boolean): string[] {
  const keyOf = new Map<object, string>();
  const items: RemoteItem[] = remote.map((entry) => {
    if (entry.keptNoteId === null) {
      const item = { uri: entry.uri } as TrendingNote;
      keyOf.set(item, entry.key);
      return { kind: "pool", item };
    }
    const note = { id: entry.keptNoteId, author: { username: "mina@k.example" } } as Note;
    keyOf.set(note, entry.key);
    return entry.uri ? { kind: "kept", note, uri: entry.uri } : { kind: "kept", note };
  });
  const seen = new Set<string>();
  const mine = own.filter((item) => {
    const id = `${item.kind}:${item.id}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  const notes = new Set(mine.filter((item) => item.kind === "note").map((item) => item.id));
  const rows = remoteBesides(remoteRows([{ items, next: null }], () => null, new Set()), notes);
  return mixHome(
    mine.map((item) => item.key),
    rows.map((row) => keyOf.get(row.kind === "pool" ? row.item : row.note)!),
    done,
  ).rows.map((row) => row.item);
}

const cases = (vectors.tables.pull.cases as unknown as PullCase[]).map((c) => [c.id, c] as const);

describe("what a 홈 pull says, by the shared answer table (kurl.seen-rules pull)", () => {
  it.each(cases)("%s", (id, c) => {
    const before = laidOut(c.before.own, c.before.remote, c.before.ownDone);
    const own = c.own.result === "ok" ? c.own.items : c.before.own;
    const done = c.own.result === "ok" ? (c.own.done ?? false) : c.before.ownDone;
    const remote = c.remote.result === "ok" ? c.remote.items : c.before.remote;
    const after = laidOut(own, remote, done);
    const failed = { own: c.own.result === "failed", remote: c.remote.result === "failed" };
    expect(pullNotice(new Set(before), after, failed)).toBe(RULED_AFTER_V1[id] ?? c.notice);
  });
});
