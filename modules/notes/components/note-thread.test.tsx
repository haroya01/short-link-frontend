import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Note, NoteThread } from "@/modules/notes/api/notes";

const mocks = vi.hoisted(() => ({ getNoteThread: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useLocale: () => "ko" }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ ready: true, authenticated: true, me: { id: 1, username: "dohyun" } }) }));
vi.mock("@/modules/notes/api/notes", () => ({ getNoteThread: mocks.getNoteThread }));
vi.mock("@/modules/notes/lib/note-filters", () => ({ useNoteFilters: () => [], noteVerdict: () => "show" }));
vi.mock("@/modules/blog/lib/user-blocks", () => ({ useBlockedNames: () => new Set<string>() }));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ href, children }: { href: string; children: React.ReactNode }) => createElement("a", { href }, children),
}));
vi.mock("./note-card", () => ({ NoteCard: ({ note }: { note: Note }) => createElement("article", null, note.body) }));
vi.mock("./note-composer", () => ({ NoteComposer: () => null, NoteSignInRow: () => null }));

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
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

async function render() {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(createElement(NoteThreadView, { initial: thread })));
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
