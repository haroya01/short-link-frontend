import { describe, expect, it } from "vitest";
import type { Note } from "@/modules/notes/api/notes";
import type { TrendingNote } from "@/modules/notes/api/remote-trending";
import type { RemoteRow } from "@/modules/notes/lib/remote-rows";
import type { RemoteItem } from "@/modules/notes/api/remote-trending";
import { freshRemote, knownRemote, mixHome, remoteBesides } from "./home-mix";

const local = (count: number, from = 1) => Array.from({ length: count }, (_, i) => `L${from + i}`);
const remote = (count: number, from = 1) => Array.from({ length: count }, (_, i) => `R${from + i}`);
const shown = (rows: ReturnType<typeof mixHome<string, string>>["rows"]) =>
  rows.map((row) => (row.kind === "remote" && row.tail ? `${row.item}*` : row.item));

describe("mixing other servers into 홈 최신", () => {
  it("puts two after every five of mine, in the order they came", () => {
    expect(shown(mixHome(local(12), remote(10), false).rows)).toEqual([
      ...local(5),
      "R1",
      "R2",
      ...local(5, 6),
      "R3",
      "R4",
      ...local(2, 11),
    ]);
  });

  it("does not put any after the last row of a page while mine may go on, so the next page joins without a gap", () => {
    const first = mixHome(local(10), remote(10), false);
    expect(shown(first.rows)).toEqual([...local(5), "R1", "R2", ...local(5, 6)]);
    const both = mixHome(local(15), remote(10), false);
    expect(shown(both.rows).slice(0, first.rows.length)).toEqual(shown(first.rows));
    expect(shown(both.rows).slice(first.rows.length)).toEqual(["R3", "R4", ...local(5, 11)]);
  });

  it("once mine run out, the rest of the other servers follow on as the tail", () => {
    expect(shown(mixHome(local(7), remote(6), true).rows)).toEqual([
      ...local(5),
      "R1",
      "R2",
      ...local(2, 6),
      "R3*",
      "R4*",
      "R5*",
      "R6*",
    ]);
    expect(shown(mixHome(local(5), remote(3), true).rows)).toEqual([...local(5), "R1*", "R2*", "R3*"]);
  });

  it("with nothing of mine, the other servers are the whole feed", () => {
    expect(shown(mixHome([], remote(3), true).rows)).toEqual(["R1*", "R2*", "R3*"]);
  });

  it("with no other-server posts, mine are left as they are", () => {
    expect(shown(mixHome(local(12), [], false).rows)).toEqual(local(12));
    expect(shown(mixHome(local(12), [], true).rows)).toEqual(local(12));
  });

  it("uses what there is when the other servers are short, and says how many the slots want", () => {
    const short = mixHome(local(16), remote(3), false);
    expect(shown(short.rows)).toEqual([...local(5), "R1", "R2", ...local(5, 6), "R3", ...local(6, 11)]);
    expect(short.wanted).toBe(6);
    expect(mixHome(local(5), [], false).wanted).toBe(0);
    expect(mixHome(local(6), [], false).wanted).toBe(2);
    expect(mixHome(local(16), remote(3), true).wanted).toBe(0);
  });

  it("keeps at least two of my rows between a connection card and a pair, moving the pair one row on at a time", () => {
    const cards = new Set([5, 10]);
    expect(shown(mixHome(local(16), remote(6), false, cards).rows)).toEqual([
      ...local(8),
      "R1",
      "R2",
      ...local(5, 9),
      "R3",
      "R4",
      ...local(3, 14),
    ]);
  });

  it("moves a pair off the very row a card follows, and five of mine still separate one pair from the next", () => {
    const rows = shown(mixHome(local(14), remote(4), false, new Set([4])).rows);
    expect(rows).toEqual([...local(7), "R1", "R2", ...local(5, 8), "R3", "R4", ...local(2, 13)]);
  });

  it("does not move a pair for a card further than one row away", () => {
    const rows = shown(mixHome(local(8), remote(2), false, new Set([7])).rows);
    expect(rows).toEqual([...local(5), "R1", "R2", ...local(3, 6)]);
  });

  it("a moved pair waits at the end of a page for the next one, and lands in the same place once it comes", () => {
    const cards = new Set([5]);
    const first = mixHome(local(7), remote(2), false, cards);
    expect(shown(first.rows)).toEqual(local(7));
    expect(first.wanted).toBe(0);
    const more = mixHome(local(12), remote(2), false, cards);
    expect(shown(more.rows)).toEqual([...local(8), "R1", "R2", ...local(4, 9)]);
    expect(more.wanted).toBe(2);
  });

  it("is the same for the same input", () => {
    expect(mixHome(local(23), remote(9), false)).toEqual(mixHome(local(23), remote(9), false));
  });
});

describe("other-server rows already in 홈", () => {
  const kept = (id: number): RemoteRow => ({
    kind: "kept",
    note: { id, author: { username: "mina@mastodon.social" } } as Note,
    uri: `https://mastodon.social/users/mina/statuses/${id}`,
  });
  const pool = (n: number): RemoteRow => ({
    kind: "pool",
    item: { uri: `https://qdon.space/users/a/statuses/${n}` } as TrendingNote,
    uri: `https://qdon.space/users/a/statuses/${n}`,
  });

  it("drops a kept note that 홈 already shows, and keeps the rest in order", () => {
    const rows = remoteBesides([kept(31), pool(1), kept(30), pool(2)], new Set([30, 7]));
    expect(rows.map((row) => (row.kind === "kept" ? row.note.id : row.uri))).toEqual([
      31,
      "https://qdon.space/users/a/statuses/1",
      "https://qdon.space/users/a/statuses/2",
    ]);
  });
});

describe("what a 홈 refresh adds from other servers", () => {
  const at = (minute: number) => new Date(Date.UTC(2026, 9, 23, 9, minute)).toISOString();
  const since = Date.UTC(2026, 9, 23, 9, 10);
  const pool = (n: number, minute: number): RemoteItem => ({
    kind: "pool",
    item: { uri: `https://qdon.space/users/a/statuses/${n}`, createdAt: at(minute) } as TrendingNote,
  });
  const kept = (id: number, minute: number): RemoteItem => ({
    kind: "kept",
    note: { id, createdAt: at(minute) } as Note,
    uri: `https://mastodon.social/users/mina/statuses/${id}`,
  });

  it("keeps only posts written after the last refresh that the list does not have yet, in the order they came", () => {
    const known = knownRemote([pool(1, 5), kept(31, 12)]);
    const page = [pool(2, 15), pool(1, 5), kept(31, 12), pool(3, 9), kept(32, 20), pool(4, 11)];
    expect(freshRemote(page, known, since)).toEqual([pool(2, 15), kept(32, 20), pool(4, 11)]);
  });

  it("knows a kept note by its uri too, so the same post as a pool item is not added again", () => {
    const known = knownRemote([pool(31, 5)]);
    const same: RemoteItem = {
      kind: "kept",
      note: { id: 77, createdAt: at(30) } as Note,
      uri: "https://qdon.space/users/a/statuses/31",
    };
    expect(freshRemote([same], known, since)).toEqual([]);
  });

  it("adds nothing when nothing new was written", () => {
    expect(freshRemote([pool(1, 1), kept(2, 10)], knownRemote([]), since)).toEqual([]);
  });

  it("a row already shown above keeps the same post out of the list below", () => {
    const rows: RemoteRow[] = [
      { kind: "pool", item: {} as TrendingNote, uri: "https://qdon.space/users/a/statuses/1" },
      { kind: "kept", note: { id: 31 } as Note, uri: "https://mastodon.social/users/mina/statuses/31" },
      { kind: "pool", item: {} as TrendingNote, uri: "https://qdon.space/users/a/statuses/2" },
    ];
    const above = new Set(["https://qdon.space/users/a/statuses/1", "https://mastodon.social/users/mina/statuses/31"]);
    expect(remoteBesides(rows, new Set(), above).map((row) => row.uri)).toEqual(["https://qdon.space/users/a/statuses/2"]);
  });
});
