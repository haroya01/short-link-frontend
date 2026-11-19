import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NoteRoom, QuotedNote, QuotedPost } from "@/modules/notes/api/notes";

const mocks = vi.hoisted(() => ({ composer: vi.fn(), toast: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("./note-composer", () => ({
  NoteComposer: (props: {
    room?: NoteRoom | null;
    quotedNote?: QuotedNote | null;
    quote?: QuotedPost | null;
    onDraftChange?: (state: { hasContent: boolean; id: string | null; unsaved: boolean }) => void;
  }) => {
    mocks.composer(props);
    return createElement(
      "div",
      null,
      createElement("button", {
        "data-testid": "kept",
        onClick: () => props.onDraftChange?.({ hasContent: true, id: "d1", unsaved: false }),
      }),
      createElement("button", {
        "data-testid": "not-kept",
        onClick: () => props.onDraftChange?.({ hasContent: false, id: null, unsaved: false }),
      }),
      createElement("button", {
        "data-testid": "unsaved",
        onClick: () => props.onDraftChange?.({ hasContent: false, id: null, unsaved: true }),
      }),
    );
  },
}));
vi.mock("./note-drafts-sheet", () => ({
  NoteDraftsButton: () => createElement("button", { "data-testid": "drafts" }),
}));

import { NoteQuoteDialog } from "./note-quote-dialog";

const CLUB: NoteRoom = { id: 1, name: "동아리 사람들" };
const NOTE: QuotedNote = {
  id: 9910,
  body: "퇴근하다 한강 들름 바람 미쳤음",
  createdAt: "2026-11-19T09:00:00Z",
  author: { id: 31, username: "minji", avatarUrl: null },
  media: [],
};
const POST: QuotedPost = { id: 8801, title: "비 오던 엠티의 밤", slug: "rainy-mt-night", authorUsername: "yuki_dev" };

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

type Quoted = Parameters<typeof NoteQuoteDialog>[0]["quoted"];
const open = (quoted: Quoted, onClose = () => {}) =>
  act(async () => root.render(<NoteQuoteDialog quoted={quoted} onClose={onClose} onPosted={() => {}} />));
const composer = () => mocks.composer.mock.calls.at(-1)![0];
const drafts = () => document.querySelector('[data-testid="drafts"]');

describe("where the quote dialog posts", () => {
  it("fixes the composer to the room of a room's note and offers no drafts", async () => {
    await open({ note: NOTE, room: CLUB });
    expect(composer()).toMatchObject({ quotedNote: NOTE, room: CLUB });
    expect(drafts()).toBeNull();
  });

  it("fixes the composer to the room of a room's post and offers no drafts", async () => {
    await open({ post: POST, room: CLUB });
    expect(composer()).toMatchObject({ quote: POST, room: CLUB });
    expect(drafts()).toBeNull();
  });

  it("leaves the destination to the writer for a note or a post outside rooms", async () => {
    await open({ note: NOTE });
    expect(composer().room).toBeNull();
    expect(drafts()).not.toBeNull();
    await open({ post: POST, room: null });
    expect(composer().room).toBeNull();
    expect(drafts()).not.toBeNull();
  });

  const press = (testId: string) =>
    act(async () => document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)!.click());
  const button = (label: string) => Array.from(document.querySelectorAll("button")).find((b) => b.textContent === label);
  const cancel = () => act(async () => button("cancel")!.click());

  it("asks before closing only when something is written and no draft keeps it", async () => {
    const onClose = vi.fn();
    await open({ note: NOTE, room: CLUB }, onClose);
    await cancel();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(button("highlightReplyDiscard")).toBeUndefined();

    await press("unsaved");
    await cancel();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("discardTitle");
    await act(async () => button("highlightReplyKeepWriting")!.click());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toContain("discardTitle");

    await cancel();
    await act(async () => button("highlightReplyDiscard")!.click());
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(mocks.toast).not.toHaveBeenCalled();

    await press("kept");
    await cancel();
    expect(onClose).toHaveBeenCalledTimes(3);
    expect(button("highlightReplyDiscard")).toBeUndefined();
    expect(mocks.toast).toHaveBeenCalledWith("draftSaved");
  });

  it("says a draft was saved only when the composer keeps one", async () => {
    const onClose = vi.fn();
    await open({ note: NOTE, room: CLUB }, onClose);
    await press("not-kept");
    await cancel();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mocks.toast).not.toHaveBeenCalled();

    await press("kept");
    await cancel();
    expect(mocks.toast).toHaveBeenCalledWith("draftSaved");
  });
});
