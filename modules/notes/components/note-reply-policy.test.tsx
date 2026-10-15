import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ setNoteReplyPolicy: vi.fn(), toast: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}` }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/modules/notes/api/notes", () => ({ setNoteReplyPolicy: mocks.setNoteReplyPolicy }));

import { ReplyPolicyDialog, replyRestrictedKey } from "./note-reply-policy";

let root: Root;
let host: HTMLDivElement;
const onSaved = vi.fn();
const onClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0));
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

async function open() {
  await act(async () =>
    root.render(<ReplyPolicyDialog noteId={72} current="everyone" open onClose={onClose} onSaved={onSaved} />),
  );
}

const radio = (value: string) => document.querySelector<HTMLInputElement>(`input[type="radio"][value="${value}"]`)!;
const save = () =>
  act(async () =>
    Array.from(document.querySelectorAll("button"))
      .find((b) => b.textContent === "notes.replyPolicySave")!
      .click(),
  );

describe("changing who can reply", () => {
  it("starts on the current policy and saves the new one", async () => {
    mocks.setNoteReplyPolicy.mockResolvedValue({ replyPolicy: "following" });
    await open();
    expect(radio("everyone").checked).toBe(true);
    await act(async () => radio("following").click());
    await save();
    expect(mocks.setNoteReplyPolicy).toHaveBeenCalledWith(72, "following");
    expect(onSaved).toHaveBeenCalledWith("following");
    expect(mocks.toast).toHaveBeenCalledWith("notes.replyPolicySaved");
    expect(onClose).toHaveBeenCalled();
  });

  it("stays open and says so when saving fails", async () => {
    mocks.setNoteReplyPolicy.mockRejectedValue(new Error("500"));
    await open();
    await act(async () => radio("mentioned").click());
    await save();
    expect(mocks.toast).toHaveBeenCalledWith("notes.replyPolicyFailed", "error");
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("names the reason for each policy", () => {
    expect(replyRestrictedKey("following")).toBe("replyRestrictedFollowing");
    expect(replyRestrictedKey("mentioned")).toBe("replyRestrictedMentioned");
    expect(replyRestrictedKey(undefined)).toBe("replyRestricted");
  });
});
