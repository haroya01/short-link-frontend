import { describe, expect, it } from "vitest";
import type { HomePost } from "@/modules/blog/api/home-feed";
import type { Note } from "@/modules/notes/api/notes";
import type { RoomItem, RoomListItem } from "@/modules/rooms/api/rooms";
import { arrangeRooms, dayBreak, inviteUsable, isLively, itemsOfRoom, newestNoteId, pinnedCount } from "./room-bands";

const NOW = Date.parse("2026-10-20T12:00:00+09:00");
const ago = (hours: number) => new Date(NOW - hours * 3_600_000).toISOString();

function room(id: number, hoursAgo: number | null, extra: Partial<RoomListItem> = {}): RoomListItem {
  return {
    id,
    name: `room ${id}`,
    memberCount: 3,
    role: "MEMBER",
    hiddenFromFeed: false,
    pinned: false,
    unreadCount: 0,
    faces: [],
    lastActivityAt: hoursAgo === null ? null : ago(hoursAgo),
    lastNote:
      hoursAgo === null
        ? null
        : { id: id * 10, excerpt: "hi", author: { id: 9, username: "u", displayName: null, avatarUrl: null }, createdAt: ago(hoursAgo) },
    ...extra,
  };
}

const note = (id: number, roomId: number | null, createdAt: string): RoomItem => ({
  kind: "note",
  note: { id, body: "", createdAt, room: roomId === null ? null : { id: roomId, name: "r" } } as Note,
  replies: [],
});
const post = (id: number, roomId: number, publishedAt: string): RoomItem => ({
  kind: "post",
  post: { id, publishedAt, room: { id: roomId, name: "r" } } as HomePost,
  replies: [],
});
const keys = (items: RoomItem[]) => items.map((i) => (i.kind === "note" ? `n${i.note.id}` : `p${i.post.id}`));

describe("lively or quiet", () => {
  it("a room is lively while its last note is under a week old", () => {
    expect(isLively(room(1, 24 * 7 - 1), NOW)).toBe(true);
    expect(isLively(room(1, 24 * 7), NOW)).toBe(false);
  });

  it("a room without any note is quiet even when it was just made", () => {
    expect(isLively(room(1, null, { lastActivityAt: ago(1) }), NOW)).toBe(false);
  });
});

describe("arranging the rooms tab", () => {
  it("puts pinned rooms first, each group newest first as the server orders them, and the rest in the quiet list", () => {
    const rooms = [
      room(1, 30),
      room(2, 1),
      room(3, 24 * 40),
      room(4, 24 * 12, { pinned: true }),
      room(5, null),
      room(6, 24 * 2, { pinned: true }),
    ];
    const { blocks, quiet } = arrangeRooms(rooms, NOW);
    expect(blocks.map((r) => r.id)).toEqual([6, 4, 2, 1]);
    expect(quiet.map((r) => r.id)).toEqual([3, 5]);
  });

  it("a quiet room pinned by the reader comes back up as a block", () => {
    const before = arrangeRooms([room(1, 2), room(2, 24 * 30)], NOW);
    expect(before.quiet.map((r) => r.id)).toEqual([2]);
    const after = arrangeRooms([room(1, 2), room(2, 24 * 30, { pinned: true })], NOW);
    expect(after.blocks.map((r) => r.id)).toEqual([2, 1]);
    expect(after.quiet).toEqual([]);
  });

  it("counts pins", () => {
    expect(pinnedCount([room(1, 1, { pinned: true }), room(2, 1), room(3, 1, { pinned: true })])).toBe(2);
  });
});

describe("splitting the rooms feed", () => {
  it("gives each room its own two newest items, notes and posts alike, and never another room's", () => {
    const feed = [note(1, 1, ago(1)), post(80, 1, ago(1.5)), note(2, 2, ago(2)), note(3, 1, ago(3)), note(5, null, ago(5))];
    expect(keys(itemsOfRoom(feed, 1))).toEqual(["n1", "p80"]);
    expect(keys(itemsOfRoom(feed, 2))).toEqual(["n2"]);
    expect(itemsOfRoom(feed, 3)).toEqual([]);
  });

  it("reads up to the newest note only, since 새 글 counts notes", () => {
    expect(newestNoteId([post(9000, 1, ago(0)), note(12, 1, ago(1)), note(30, 1, ago(2))])).toBe(30);
    expect(newestNoteId([post(9000, 1, ago(0))])).toBeNull();
  });
});

describe("day breaks in a room", () => {
  const now = new Date("2026-10-20T12:00:00");
  const at = (day: number, hour: number) => new Date(2026, 9, day, hour).toISOString();

  it("labels today, yesterday and older days once each", () => {
    const times = [at(20, 11), at(20, 9), at(19, 23), at(15, 8)];
    const breaks = times.map((_, i) => dayBreak(times, i, now));
    expect(breaks[0]).toEqual({ kind: "today" });
    expect(breaks[1]).toBeNull();
    expect(breaks[2]).toEqual({ kind: "yesterday" });
    expect(breaks[3]).toMatchObject({ kind: "date" });
  });
});

describe("which invite link the invite sheet hands out", () => {
  const base = { disabled: false, maxUses: null, uses: 0, expiresAt: null };
  it("skips a link that is off, used up or expired, and keeps one with room left", () => {
    expect(inviteUsable(base, NOW)).toBe(true);
    expect(inviteUsable({ ...base, disabled: true }, NOW)).toBe(false);
    expect(inviteUsable({ ...base, maxUses: 5, uses: 5 }, NOW)).toBe(false);
    expect(inviteUsable({ ...base, maxUses: 5, uses: 4 }, NOW)).toBe(true);
    expect(inviteUsable({ ...base, expiresAt: ago(1) }, NOW)).toBe(false);
    expect(inviteUsable({ ...base, expiresAt: ago(-1) }, NOW)).toBe(true);
  });
});
