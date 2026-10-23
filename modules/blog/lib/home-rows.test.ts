import { describe, expect, it } from "vitest";
import type { HomeItem, HomePost } from "@/modules/blog/api/home-feed";
import type { Note } from "@/modules/notes/api/notes";
import type { TrendingNote } from "@/modules/notes/api/remote-trending";
import { homeRows, type HomeJudge, type HomeRow } from "./home-rows";

const note = (id: number, username = "yuna"): HomeItem => ({ kind: "note", note: { id, author: { username } } as Note });
const post = (id: number, username = "minji"): HomeItem => ({
  kind: "post",
  post: { id, author: { username } } as HomePost,
});
const pool = (n: number): HomeItem => ({
  kind: "remote",
  remote: { kind: "pool", item: { uri: `https://s.example/s/${n}`, author: { username: `a${n}@s.example` } } as TrendingNote },
});
const kept = (id: number, uri?: string): HomeItem => ({
  kind: "remote",
  remote: { kind: "kept", note: { id, author: { username: "mina@m.example" } } as Note, ...(uri ? { uri } : {}) },
});

const judge = (over: Partial<HomeJudge> = {}): HomeJudge => ({
  note: () => null,
  remote: () => null,
  blocked: new Set(),
  ...over,
});
const keys = (rows: HomeRow[]) =>
  rows.map((row) =>
    row.kind === "remote" ? (row.row.kind === "pool" ? `R${row.row.uri.split("/").pop()}` : `K${row.row.note.id}`) : `${row.kind[0]}${row.kind === "note" ? row.note.id : row.post.id}`,
  );

describe("the rows 추천 draws, in the order the server ranked them", () => {
  it("keeps the order across notes, posts and other servers' posts", () => {
    expect(keys(homeRows([pool(1), note(5), post(7), kept(31, "https://m.example/s/31"), note(6)], judge()))).toEqual([
      "R1",
      "n5",
      "p7",
      "K31",
      "n6",
    ]);
  });

  it("draws a post once when it comes twice: by id, by uri, and a kept note that is also one of ours", () => {
    const rows = homeRows(
      [note(5), note(5), post(7), post(7), pool(1), pool(1), kept(31, "https://s.example/s/1"), kept(5), kept(40), kept(40)],
      judge(),
    );
    expect(keys(rows)).toEqual(["n5", "p7", "R1", "K40"]);
  });

  it("leaves out blocked authors and hidden posts, and keeps the words that warned", () => {
    const rows = homeRows(
      [note(5, "blocked"), post(7, "blocked"), note(6), pool(1), pool(2)],
      judge({
        blocked: new Set(["blocked"]),
        note: () => ({ action: "warn", phrases: ["스포"] }),
        remote: (entry) => (entry.kind === "pool" && entry.item.uri.endsWith("/2") ? { action: "hide" } : null),
      }),
    );
    expect(keys(rows)).toEqual(["n6", "R1"]);
    expect(rows[0]).toMatchObject({ kind: "note", filteredBy: ["스포"] });
  });
});
