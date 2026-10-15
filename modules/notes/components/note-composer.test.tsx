import React, { act, createElement, forwardRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NoteReplyPolicy } from "@/modules/notes/api/notes";
import type { NoteDraft } from "@/modules/notes/lib/note-drafts";

const mocks = vi.hoisted(() => ({ createNote: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useLocale: () => "ko" }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ me: { id: 1, username: "dohyun", avatarUrl: null } }) }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/modules/notes/api/notes", async (original) => ({
  ...(await original<typeof import("@/modules/notes/api/notes")>()),
  createNote: mocks.createNote,
  createThread: vi.fn(),
  getFederationSettings: () => Promise.resolve({ enabled: false, noticeSeen: true, handle: null }),
  updateFederationSettings: vi.fn(),
}));
vi.mock("@/modules/blog/api/public-posts", () => ({ getLinkPreview: () => Promise.resolve({ ok: false }) }));
vi.mock("./note-card", () => ({ NoteLengthRing: () => null }));
vi.mock("next-view-transitions", () => ({ Link: (props: { children: React.ReactNode }) => createElement("a", null, props.children) }));
vi.mock("./scheduled-notes", () => ({
  defaultLocal: () => "",
  earliestLocal: () => "",
  scheduleError: () => "scheduleFailed",
  ScheduledNotesPanel: () => null,
  useWhen: () => (iso: string) => iso,
}));
vi.mock("@/modules/mentions/mention-textarea", () => ({
  MentionTextarea: forwardRef<HTMLTextAreaElement, { value: string; onValueChange: (v: string) => void }>(
    function MentionTextarea({ value, onValueChange }, ref) {
      return createElement("textarea", {
        ref,
        "aria-label": "body",
        value,
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onValueChange(e.target.value),
      });
    },
  ),
}));

import { ApiError } from "@/lib/api/client";
import { NoteComposer } from "./note-composer";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.sessionStorage.clear();
  window.localStorage.clear();
  mocks.createNote.mockImplementation((draft: { body: string }) =>
    Promise.resolve({ id: 500, body: draft.body, linkPreview: null }),
  );
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function render(
  props: {
    inReplyToId?: number;
    threadReplyPolicy?: NoteReplyPolicy;
    draft?: NoteDraft;
    onDraftChange?: (state: { hasContent: boolean; id: string | null }) => void;
  } = {},
) {
  await act(async () => root.render(<NoteComposer onCreated={vi.fn()} {...props} />));
}

const stored = (): NoteDraft[] => JSON.parse(window.localStorage.getItem("kurl:note-drafts:1") ?? "[]");
const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 450)));

async function type(text: string) {
  const field = host.querySelector<HTMLTextAreaElement>('textarea[aria-label="body"]')!;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    setter.call(field, text);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const policySelect = () => host.querySelector<HTMLSelectElement>('select[aria-label="replyPolicyLabel"]');
const submit = () =>
  act(async () =>
    Array.from(host.querySelectorAll("button"))
      .find((b) => b.textContent === "submit" || b.textContent === "replySubmit")!
      .click(),
  );

describe("who can reply, chosen while writing", () => {
  it("sends the chosen policy with a new note and explains that mentions can still reply", async () => {
    await render();
    await type("다음 주 회고 안건 @haruka");
    expect(host.querySelector('[data-testid="reply-policy-hint"]')).toBeNull();
    await act(async () => {
      policySelect()!.value = "mentioned";
      policySelect()!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(host.querySelector('[data-testid="reply-policy-hint"]')!.textContent).toBe("replyPolicyHint");
    await submit();
    expect(mocks.createNote).toHaveBeenCalledWith(expect.objectContaining({ replyPolicy: "mentioned" }));
    expect(policySelect()?.value ?? "everyone").toBe("everyone");
  });

  it("leaves the policy out when everyone can reply", async () => {
    await render();
    await type("오늘의 한 줄");
    await submit();
    expect(mocks.createNote.mock.calls[0][0]).not.toHaveProperty("replyPolicy");
  });

  it("has no policy picker on a reply", async () => {
    await render({ inReplyToId: 70 });
    await type("저도요");
    expect(policySelect()).toBeNull();
  });

  it("says why a reply was refused and keeps what was written", async () => {
    mocks.createNote.mockRejectedValue(new ApiError(403, { status: 403, code: "NOTE_REPLY_RESTRICTED" }));
    await render({ inReplyToId: 70, threadReplyPolicy: "following" });
    await type("저도 끼워 주세요");
    await submit();
    expect(host.querySelector('[role="alert"]')!.textContent).toBe("replyRestrictedFollowing");
    expect(host.querySelector<HTMLTextAreaElement>('textarea[aria-label="body"]')!.value).toBe("저도 끼워 주세요");
  });
});

describe("device drafts", () => {
  const draft = (over: Partial<NoteDraft> = {}): NoteDraft => ({
    id: "d1",
    updatedAt: 1,
    body: "쓰던 노트",
    parts: ["둘째 노트"],
    warning: "스포일러",
    visibility: "unlisted",
    replyPolicy: "following",
    language: "ja",
    poll: null,
    scheduledAt: "",
    quote: null,
    imageCount: 2,
    ...over,
  });

  it("keeps what is typed as this account's draft, and drops it once the text is gone", async () => {
    const onDraftChange = vi.fn();
    await render({ onDraftChange });
    await type("닫아도 남아야 하는 글");
    expect(onDraftChange).toHaveBeenLastCalledWith({ hasContent: true, id: null });
    await settle();
    expect(stored()).toHaveLength(1);
    expect(stored()[0]).toMatchObject({ body: "닫아도 남아야 하는 글", visibility: "public", replyPolicy: "everyone" });
    expect(onDraftChange).toHaveBeenLastCalledWith({ hasContent: true, id: stored()[0].id });

    await type("");
    await settle();
    expect(stored()).toEqual([]);
  });

  it("saves on close even when the pause has not passed yet", async () => {
    await render();
    await type("곧바로 닫은 글");
    await act(async () => root.unmount());
    expect(stored()[0].body).toBe("곧바로 닫은 글");
    root = createRoot(host);
  });

  it("deletes the draft once the note is posted", async () => {
    await render();
    await type("올릴 글");
    await settle();
    expect(stored()).toHaveLength(1);
    await submit();
    expect(mocks.createNote).toHaveBeenCalled();
    await settle();
    expect(stored()).toEqual([]);
  });

  it("restores a draft's text, warning, visibility, reply policy and thread, and says the photos were not kept", async () => {
    await render({ draft: draft() });
    expect(host.querySelector<HTMLTextAreaElement>('textarea[aria-label="body"]')!.value).toBe("쓰던 노트");
    expect(host.querySelector<HTMLInputElement>('input[aria-label="warningLabel"]')!.value).toBe("스포일러");
    expect(host.querySelector<HTMLSelectElement>('select[aria-label="visibilityLabel"]')!.value).toBe("unlisted");
    expect(policySelect()!.value).toBe("following");
    expect(host.querySelector<HTMLSelectElement>('select[aria-label="languageLabel"]')!.value).toBe("ja");
    expect(Array.from(host.querySelectorAll<HTMLTextAreaElement>("textarea")).map((t) => t.value)).toContain("둘째 노트");
    expect(host.querySelector('[data-testid="draft-images-dropped"]')!.textContent).toBe("draftImagesDropped");
  });

  it("does not move a reopened draft to the top until it is edited", async () => {
    window.localStorage.setItem("kurl:note-drafts:1", JSON.stringify([draft({ updatedAt: 5 })]));
    await render({ draft: draft({ updatedAt: 5 }) });
    await settle();
    expect(stored()[0].updatedAt).toBe(5);
    await type("고친 글");
    await settle();
    expect(stored()[0].updatedAt).toBeGreaterThan(5);
    expect(stored()[0].id).toBe("d1");
  });

  it("drops a schedule that has already passed", async () => {
    await render({ draft: draft({ scheduledAt: "2020-01-01T09:00", parts: [] }) });
    expect(host.querySelector('input[type="datetime-local"]')).toBeNull();
  });

  it("never keeps a reply as a device draft", async () => {
    await render({ inReplyToId: 70 });
    await type("답글은 그 자리에서만");
    await settle();
    expect(stored()).toEqual([]);
  });
});
