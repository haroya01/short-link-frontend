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
  NOTE_MAX_THREAD_NOTES: 10,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/auth/login-prompt", () => ({ askToSignIn: vi.fn() }));
vi.mock("@/modules/blog/components/avatar", () => ({ Avatar: () => null }));
vi.mock("./note-reply-dialog", () => ({
  NoteReplyDialog: ({ target }: { target: Note | null }) =>
    target ? createElement("div", { "data-reply-dialog": target.id }) : null,
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
    onReplied,
  }: {
    note: Note;
    replyModeration?: { hidden: boolean; onToggleHidden: () => void; onRemove: () => void };
    onReplied?: (reply: Note) => void;
  }) =>
    createElement(
      "article",
      { "data-note": note.id },
      note.body,
      onReplied &&
        createElement(
          "button",
          {
            type: "button",
            "data-reply": note.id,
            onClick: () =>
              onReplied({
                id: 500 + note.id,
                body: `answer to ${note.id}`,
                author: { id: 2, username: "minji", avatarUrl: null },
                inReplyToId: note.id,
                replyCount: 0,
              } as unknown as Note),
          },
          "reply",
        ),
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
  it("shows why the reader can't reply instead of the reply row", async () => {
    const restricted = {
      ...thread,
      note: { ...thread.note, id: 70, author: author(15, "yuna"), replyPolicy: "mentioned", canReply: false },
    } as unknown as NoteThread;
    mocks.getNoteThread.mockResolvedValue(restricted);
    await render(restricted);
    expect(host.querySelector('[data-testid="reply-restricted"]')!.textContent).toBe("replyRestrictedMentioned");
    expect(host.querySelector('[data-testid="note-reply-prompt"]')).toBeNull();
  });

  it("keeps the reply row when the server doesn't say yet, and the row opens the sheet for the open note", async () => {
    mocks.getNoteThread.mockResolvedValue(thread);
    await render();
    expect(host.querySelector('[data-testid="reply-restricted"]')).toBeNull();
    expect(host.querySelector("[data-reply-dialog]")).toBeNull();
    await act(async () => host.querySelector<HTMLButtonElement>('[data-testid="note-reply-prompt"]')!.click());
    expect(host.querySelector("[data-reply-dialog]")!.getAttribute("data-reply-dialog")).toBe("90");
  });
});

describe("where a new reply lands", () => {
  const withReplies = {
    ...thread,
    note: { ...thread.note, replyCount: 1 },
    replies: [{ id: 91, body: "먼저 단 답글", author: { id: 3, username: "yuna", avatarUrl: null }, inReplyToId: 90, replyCount: 0, createdAt: "2026-09-19T10:00:00Z" }],
  } as unknown as NoteThread;

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });

  it("puts a reply to the open note above the others and brings it into view", async () => {
    mocks.getNoteThread.mockResolvedValue(withReplies);
    await render(withReplies);
    expect(host.querySelector("#note-replies")!.textContent).toBe("repliesTitle 1");
    await act(async () => host.querySelector<HTMLButtonElement>('[data-reply="90"]')!.click());
    expect(Array.from(host.querySelectorAll("section article")).map((a) => a.getAttribute("data-note"))).toEqual([
      "590",
      "91",
    ]);
    expect(host.querySelector("#note-replies")!.textContent).toBe("repliesTitle 2");
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("only says so when the reply went to a note further down", async () => {
    mocks.getNoteThread.mockResolvedValue(withReplies);
    await render(withReplies);
    await act(async () => host.querySelector<HTMLButtonElement>('[data-reply="91"]')!.click());
    expect(host.querySelectorAll("section article")).toHaveLength(1);
    expect(mocks.toast).toHaveBeenCalledWith("replyPosted", "default", expect.objectContaining({ action: expect.anything() }));
  });

  it("names no replies heading until there is a reply", async () => {
    mocks.getNoteThread.mockResolvedValue(thread);
    await render();
    expect(host.querySelector("#note-replies")).toBeNull();
    expect(host.textContent).not.toContain("noReplies");
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
    hiddenReplyCount: 0,
    viewerCanModerate: true,
  } as unknown as NoteThread;
  const hiddenRow = () =>
    Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "hiddenRepliesShow");

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
    expect(hiddenRow()).toBeUndefined();
    await act(async () => host.querySelector<HTMLButtonElement>('[data-moderate="73"]')!.click());
    expect(mocks.setNoteReplyHidden).toHaveBeenCalledWith(73, true);
    expect(host.querySelector('[data-note="73"]')).toBeNull();
    mocks.listHiddenReplies.mockResolvedValue([reply(73, author(15, "yuna"), { hidden: true })]);
    await act(async () => hiddenRow()!.click());
    const hidden = host.querySelector('[data-testid="hidden-replies"]')!;
    expect(hidden.querySelector("h3")!.textContent).toBe("hiddenRepliesTitle");
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

  it("asks for hidden replies only when the row is tapped", async () => {
    const withHidden = { ...mine, hiddenReplyCount: 1 } as NoteThread;
    mocks.getNoteThread.mockResolvedValue(withHidden);
    mocks.listHiddenReplies.mockResolvedValue([reply(74, author(-9800, "mina@mastodon.social"), { hidden: true })]);
    await render(withHidden);
    expect(mocks.listHiddenReplies).not.toHaveBeenCalled();
    await act(async () => hiddenRow()!.click());
    expect(mocks.listHiddenReplies).toHaveBeenCalledWith(72);
    expect(host.querySelector('[data-testid="hidden-replies"] [data-note="74"]')).not.toBeNull();
  });

  it("keeps the row closed when hidden replies fail to load", async () => {
    const withHidden = { ...mine, hiddenReplyCount: 1 } as NoteThread;
    mocks.getNoteThread.mockResolvedValue(withHidden);
    mocks.listHiddenReplies.mockRejectedValue(new ApiError(503, { status: 503 } as never));
    await render(withHidden);
    await act(async () => hiddenRow()!.click());
    expect(mocks.toast).toHaveBeenCalledWith("hiddenRepliesFailed", "error");
    expect(host.querySelector('[data-testid="hidden-replies"]')).toBeNull();
    expect(hiddenRow()!.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows no row when the server doesn't count hidden replies", async () => {
    const uncounted = { ...mine, hiddenReplyCount: undefined } as NoteThread;
    mocks.getNoteThread.mockResolvedValue(uncounted);
    await render(uncounted);
    await act(async () => host.querySelector<HTMLButtonElement>('[data-moderate="73"]')!.click());
    expect(host.querySelector('[data-note="73"]')).toBeNull();
    expect(hiddenRow()).toBeUndefined();
    expect(mocks.listHiddenReplies).not.toHaveBeenCalled();
  });

  it("follows the server when it says who may moderate", async () => {
    const denied = { ...mine, viewerCanModerate: false } as NoteThread;
    mocks.getNoteThread.mockResolvedValue(denied);
    await render(denied);
    expect(host.querySelector("[data-moderate]")).toBeNull();
  });

  it("falls back to the first writer when the server doesn't say", async () => {
    const unsaid = { ...mine, viewerCanModerate: undefined } as NoteThread;
    mocks.getNoteThread.mockResolvedValue(unsaid);
    await render(unsaid);
    expect(host.querySelector('[data-moderate="73"]')).not.toBeNull();
    const theirs = { ...unsaid, note: { ...mine.note, author: author(15, "yuna") } } as unknown as NoteThread;
    mocks.getNoteThread.mockResolvedValue(theirs);
    await act(async () => root.unmount());
    host.remove();
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
    expect(host.textContent).not.toContain("hiddenRepliesShow");
    expect(mocks.listHiddenReplies).not.toHaveBeenCalled();
  });
});
