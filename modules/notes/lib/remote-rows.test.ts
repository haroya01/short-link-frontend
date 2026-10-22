import { describe, expect, it } from "vitest";
import type { Note } from "@/modules/notes/api/notes";
import type { RemoteItem, RemoteNotesPage, TrendingNote } from "@/modules/notes/api/remote-trending";
import type { FilterVerdict } from "./note-filter-match";
import { remoteRows } from "./remote-rows";

const pool = (n: number): RemoteItem => ({
  kind: "pool",
  item: { uri: `https://qdon.space/users/a/statuses/${n}`, body: `글 ${n}` } as TrendingNote,
});
const kept = (id: number, uri?: string): RemoteItem => ({
  kind: "kept",
  note: { id, body: `노트 ${id}`, author: { username: "mina@mastodon.social" } } as Note,
  ...(uri ? { uri } : {}),
});
const page = (items: RemoteItem[], seenFrom?: number): RemoteNotesPage =>
  seenFrom === undefined ? { items, next: "x" } : { items, next: "x", seenFrom };

const keep = (_entry: RemoteItem): FilterVerdict | null => null;
const none = new Set<string>();
const dividedAt = (pages: RemoteNotesPage[], judge = keep) =>
  remoteRows(pages, judge, none).flatMap((row, i) => (row.seenStart ? [i] : []));

describe("where 이미 본 글 starts", () => {
  it("goes before the row at seenFrom", () => {
    expect(dividedAt([page([pool(1), pool(2), pool(3)], 2)])).toEqual([2]);
  });

  it("counts rows across pages, and only one divider is drawn", () => {
    expect(dividedAt([page([pool(1), pool(2)]), page([pool(3), kept(4)], 1), page([pool(5)])])).toEqual([3]);
  });

  it("at index 0 it sits above the whole page", () => {
    expect(dividedAt([page([pool(1)]), page([pool(2), pool(3)], 0)])).toEqual([1]);
  });

  it("a hidden row at seenFrom moves it to the next row shown", () => {
    const judge = (entry: RemoteItem) =>
      entry.kind === "pool" && entry.item.uri.endsWith("/2") ? ({ action: "hide" } as const) : null;
    expect(dividedAt([page([pool(1), pool(2), pool(3)], 1)], judge)).toEqual([1]);
  });

  it("a page whose seen part is empty puts it above the next page", () => {
    expect(dividedAt([page([pool(1), pool(2)], 2), page([pool(3)])])).toEqual([2]);
  });

  it("a repeat dropped as a duplicate does not take it", () => {
    expect(dividedAt([page([pool(1), pool(2)]), page([pool(2), pool(3)], 0)])).toEqual([2]);
  });

  it("without seenFrom there is no divider", () => {
    expect(dividedAt([page([pool(1), kept(2)]), page([pool(3)])])).toEqual([]);
  });

  it("keeps a kept note's uri so it can be reported", () => {
    const rows = remoteRows([page([kept(9, "https://mastodon.social/users/mina/statuses/9"), kept(10)])], keep, none);
    expect(rows.map((row) => row.uri)).toEqual(["https://mastodon.social/users/mina/statuses/9", null]);
  });
});

describe("duplicates across pages", () => {
  const at = (n: number) => `https://mastodon.social/users/mina/statuses/${n}`;
  const shown = (pages: RemoteNotesPage[]) =>
    remoteRows(pages, keep, none).map((row) => (row.kind === "pool" ? row.uri : `kept:${row.note.id}`));

  it("a kept note that comes back on a later page under the same uri is shown once", () => {
    expect(shown([page([kept(9, at(9)), pool(1)]), page([kept(9, at(9)), pool(2)])])).toEqual([
      "kept:9",
      "https://qdon.space/users/a/statuses/1",
      "https://qdon.space/users/a/statuses/2",
    ]);
  });

  it("a pool item and a kept note with the same uri are one post", () => {
    const same = "https://qdon.space/users/a/statuses/5";
    expect(shown([page([pool(5)]), page([kept(40, same), kept(41, at(41))])])).toEqual([same, "kept:41"]);
    expect(shown([page([kept(40, same)]), page([pool(5)])])).toEqual(["kept:40"]);
  });
});
