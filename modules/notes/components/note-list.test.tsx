import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Note, NoteFeed } from "@/modules/notes/api/notes";

const mocks = vi.hoisted(() => ({ listBlockedUsers: vi.fn(), unblockUser: vi.fn() }));

vi.mock("next-intl", () => ({ useLocale: () => "ko", useTranslations: () => (key: string) => key }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ authenticated: true, ready: true, me: { id: 1, username: "dohyun" } }),
}));
vi.mock("@/modules/notes/lib/note-filters", () => ({ useNoteFilters: () => [], noteVerdict: () => null }));
vi.mock("@/modules/blog/api/follows", () => ({
  listBlockedUsers: mocks.listBlockedUsers,
  blockUser: vi.fn(),
  unblockUser: mocks.unblockUser,
}));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ children, href }: { children: React.ReactNode; href: string }) => createElement("a", { href }, children),
}));
vi.mock("./note-card", () => ({
  NoteCard: ({ note }: { note: Note }) => createElement("article", { "data-author": note.author.username }, note.body),
  noteHref: () => "/note",
}));

let root: Root;
let host: HTMLDivElement;

const note = (id: number, username: string): Note =>
  ({ id, body: `note ${id}`, author: { id, username, avatarUrl: null }, thread: null }) as unknown as Note;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.unblockUser.mockResolvedValue(undefined);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

describe("a note list with a blocked author", () => {
  it("leaves their notes out, and brings them back on unblock", async () => {
    mocks.listBlockedUsers.mockResolvedValue([{ id: 15, username: "yuna", avatarUrl: null }]);
    const { NoteList } = await import("./note-list");
    const { unblockAuthor } = await import("@/modules/blog/lib/user-blocks");
    const feed: NoteFeed = { items: [note(1, "yuna"), note(2, "haruka")], page: 0, hasNext: false } as NoteFeed;
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(createElement(NoteList, { load: () => Promise.resolve(feed), empty: "empty" })));

    const authors = () => Array.from(host.querySelectorAll("article")).map((a) => a.dataset.author);
    expect(authors()).toEqual(["haruka"]);

    await act(async () => { await unblockAuthor("yuna"); });
    expect(authors()).toEqual(["yuna", "haruka"]);
  });
});
