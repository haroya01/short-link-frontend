import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Note, NoteThread } from "@/modules/notes/api/notes";

const mocks = vi.hoisted(() => ({
  getNoteThread: vi.fn(),
  listHiddenReplies: vi.fn(),
  setNoteReplyHidden: vi.fn(),
  deleteNote: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useLocale: () => "ko" }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ ready: true, authenticated: true, me: { id: 1, username: "dohyun" } }) }));
vi.mock("@/modules/notes/api/notes", () => ({
  getNoteThread: mocks.getNoteThread,
  listHiddenReplies: mocks.listHiddenReplies,
  setNoteReplyHidden: mocks.setNoteReplyHidden,
  deleteNote: mocks.deleteNote,
}));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/modules/notes/lib/note-filters", () => ({ useNoteFilters: () => [], noteVerdict: () => "show" }));
vi.mock("@/modules/blog/lib/user-blocks", () => ({ useBlockedNames: () => new Set<string>() }));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ href, children }: { href: string; children: React.ReactNode }) => createElement("a", { href }, children),
}));
vi.mock("./note-card", () => ({
  NoteCard: ({
    note,
    replyModeration,
  }: {
    note: Note;
    replyModeration?: { hidden: boolean; onToggleHidden: () => void; onRemove: () => void };
  }) =>
    createElement(
      "article",
      { "data-note": note.id },
      note.body,
      replyModeration &&
        createElement(
          "button",
          { type: "button", "data-moderate": note.id, onClick: replyModeration.onToggleHidden },
          replyModeration.hidden ? "unhide" : "hide",
        ),
      replyModeration &&
        createElement("button", { type: "button", "data-remove": note.id, onClick: replyModeration.onRemove }, "remove"),
    ),
}));
vi.mock("./note-composer", () => ({ NoteComposer: () => createElement("textarea", { "aria-label": "composer" }) }));

import { ApiError } from "@/lib/api/client";
import { NoteThreadView } from "./note-thread";

const thread = {
  note: { id: 90, body: "불 끄고 나서야 써지는 문장이 있다.", author: { id: 16, username: "rin", avatarUrl: null }, replyCount: 0 },
  parent: null,
  replies: [],
  continuation: [],
  series: null,
} as unknown as NoteThread;

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.listHiddenReplies.mockResolvedValue([]);
  mocks.setNoteReplyHidden.mockImplementation((_id: number, hidden: boolean) => Promise.resolve({ hidden }));
  mocks.deleteNote.mockResolvedValue(undefined);
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

async function render(initial: NoteThread = thread) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(createElement(NoteThreadView, { initial })));
}

describe("a note thread re-read as the signed-in reader", () => {
  it("becomes unavailable when the reader's own request answers 404", async () => {
    mocks.getNoteThread.mockRejectedValue(new ApiError(404, { status: 404, code: "NOTE_NOT_FOUND" } as never));
    await render();
    expect(host.querySelector('[data-testid="note-unavailable"]')!.textContent).toBe("threadUnavailable");
    expect(host.textContent).not.toContain(thread.note.body);
  });

  it("keeps the thread it has when the re-read fails for another reason", async () => {
    mocks.getNoteThread.mockRejectedValue(new ApiError(503, { status: 503 } as never));
    await render();
    expect(host.querySelector('[data-testid="note-unavailable"]')).toBeNull();
    expect(host.textContent).toContain(thread.note.body);
  });
});

const author = (id: number, username: string) => ({ id, username, avatarUrl: null });
const reply = (id: number, by: ReturnType<typeof author>, extra: Partial<Note> = {}) =>
  ({ id, body: `reply ${id}`, author: by, inReplyToId: 72, createdAt: `2026-09-19T1${id % 10}:00:00Z`, ...extra }) as unknown as Note;

describe("who can reply", () => {
  it("shows why the reader can't reply instead of the composer", async () => {
    const restricted = {
      ...thread,
      note: { ...thread.note, id: 70, author: author(15, "yuna"), replyPolicy: "mentioned", canReply: false },
    } as unknown as NoteThread;
    mocks.getNoteThread.mockResolvedValue(restricted);
    await render(restricted);
    expect(host.querySelector('[data-testid="reply-restricted"]')!.textContent).toBe("replyRestrictedMentioned");
    expect(host.querySelector('[aria-label="composer"]')).toBeNull();
  });

  it("keeps the composer when the server doesn't say yet", async () => {
    mocks.getNoteThread.mockResolvedValue(thread);
    await render();
    expect(host.querySelector('[aria-label="composer"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="reply-restricted"]')).toBeNull();
  });
});

describe("the first note's writer looking after the replies", () => {
  const mine = {
    note: {
      id: 72,
      body: "산책 코스 추천받아요.",
      author: author(1, "dohyun"),
      inReplyToId: null,
      replyCount: 2,
      replyPolicy: "everyone",
    },
    parent: null,
    replies: [reply(73, author(15, "yuna")), reply(75, author(21, "haruka")), reply(76, author(1, "dohyun"))],
    continuation: [],
    series: null,
  } as unknown as NoteThread;

  it("offers hide and remove on others' replies only", async () => {
    mocks.getNoteThread.mockResolvedValue(mine);
    await render(mine);
    expect(host.querySelector('[data-moderate="73"]')).not.toBeNull();
    expect(host.querySelector('[data-moderate="75"]')).not.toBeNull();
    expect(host.querySelector('[data-moderate="76"]')).toBeNull();
  });

  it("moves a hidden reply under 숨긴 답글 and back", async () => {
    mocks.getNoteThread.mockResolvedValue(mine);
    await render(mine);
    await act(async () => host.querySelector<HTMLButtonElement>('[data-moderate="73"]')!.click());
    expect(mocks.setNoteReplyHidden).toHaveBeenCalledWith(73, true);
    expect(host.querySelector('[data-note="73"]')).toBeNull();
    const row = Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "hiddenRepliesShow")!;
    await act(async () => row.click());
    const hidden = host.querySelector('[data-testid="hidden-replies"]')!;
    expect(hidden.querySelector('[data-note="73"]')).not.toBeNull();
    await act(async () => hidden.querySelector<HTMLButtonElement>('[data-moderate="73"]')!.click());
    expect(mocks.setNoteReplyHidden).toHaveBeenLastCalledWith(73, false);
    expect(host.querySelector('[data-testid="hidden-replies"]')).toBeNull();
    expect(host.querySelector('[data-note="73"]')).not.toBeNull();
  });

  it("removes someone's reply from the thread", async () => {
    mocks.getNoteThread.mockResolvedValue(mine);
    await render(mine);
    await act(async () => host.querySelector<HTMLButtonElement>('[data-remove="75"]')!.click());
    expect(mocks.deleteNote).toHaveBeenCalledWith(75);
    expect(host.querySelector('[data-note="75"]')).toBeNull();
    expect(mocks.toast).toHaveBeenCalledWith("replyRemovedToast");
  });

  it("lists replies hidden before the page opened", async () => {
    mocks.getNoteThread.mockResolvedValue(mine);
    mocks.listHiddenReplies.mockResolvedValue([reply(74, author(-9800, "mina@mastodon.social"), { hidden: true })]);
    await render(mine);
    expect(mocks.listHiddenReplies).toHaveBeenCalledWith(72);
    expect(Array.from(host.querySelectorAll("button")).some((b) => b.textContent === "hiddenRepliesShow")).toBe(true);
  });

  it("gives a reader who isn't the first writer nothing to moderate", async () => {
    const theirs = { ...mine, note: { ...mine.note, author: author(15, "yuna") } } as unknown as NoteThread;
    mocks.getNoteThread.mockResolvedValue(theirs);
    await render(theirs);
    expect(host.querySelector("[data-moderate]")).toBeNull();
  });
});

describe("before the server knows reply controls", () => {
  it("offers no moderation and asks for no hidden replies", async () => {
    const older = {
      note: { id: 72, body: "산책 코스 추천받아요.", author: author(1, "dohyun"), inReplyToId: null, replyCount: 1 },
      parent: null,
      replies: [reply(73, author(15, "yuna"))],
      continuation: [],
      series: null,
    } as unknown as NoteThread;
    mocks.getNoteThread.mockResolvedValue(older);
    await render(older);
    expect(host.querySelector("[data-moderate]")).toBeNull();
    expect(mocks.listHiddenReplies).not.toHaveBeenCalled();
  });
});
