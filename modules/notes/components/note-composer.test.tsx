import React, { act, createElement, forwardRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NoteReplyPolicy } from "@/modules/notes/api/notes";

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

async function render(props: { inReplyToId?: number; threadReplyPolicy?: NoteReplyPolicy } = {}) {
  await act(async () => root.render(<NoteComposer onCreated={vi.fn()} {...props} />));
}

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
