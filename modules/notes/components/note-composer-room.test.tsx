import React, { act, createElement, forwardRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NoteReplyPolicy } from "@/modules/notes/api/notes";
import type { NoteDraft } from "@/modules/notes/lib/note-drafts";

const mocks = vi.hoisted(() => ({ createNote: vi.fn(), listMyRooms: vi.fn() }));
vi.mock("@/modules/rooms/api/rooms", () => ({ listMyRooms: mocks.listMyRooms }));
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
  mocks.listMyRooms.mockResolvedValue([{ id: 5, name: "우리 가족" }]);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

const FAMILY = { id: 5, name: "우리 가족" };
const stored = (): NoteDraft[] => JSON.parse(window.localStorage.getItem("kurl:note-drafts:1") ?? "[]");
const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 450)));
const button = (label: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent === label);

async function type(text: string) {
  const field = host.querySelector<HTMLTextAreaElement>('textarea[aria-label="body"]')!;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    setter.call(field, text);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("the composer inside a room", () => {
  it("never keeps a device draft, typed or left behind", async () => {
    await act(async () => root.render(<NoteComposer room={FAMILY} onCreated={vi.fn()} />));
    await type("주말에 다들 와");
    await settle();
    expect(stored()).toEqual([]);
    await act(async () => root.unmount());
    root = createRoot(host);
    expect(stored()).toEqual([]);
  });

  it("posts into the room with no visibility of its own, names the room on the button and has no schedule", async () => {
    await act(async () => root.render(<NoteComposer room={FAMILY} onCreated={vi.fn()} />));
    await type("주말에 다들 와");
    expect(host.querySelector("[data-note-room-audience]")?.textContent).toBe("roomAudience");
    expect(host.querySelector('select[aria-label="visibilityLabel"]')).toBeNull();
    expect(host.querySelector('button[aria-label="scheduleToggle"]')).toBeNull();
    expect(host.querySelector("[data-note-destination]")).toBeNull();
    await act(async () => button("postToRoom")!.click());
    expect(mocks.createNote).toHaveBeenCalledWith(expect.objectContaining({ roomId: 5, visibility: null }));
    expect(mocks.listMyRooms).not.toHaveBeenCalled();
  });
});

describe("picking where a new note goes", () => {
  it("drops the kept draft once a room is picked, and sends the room", async () => {
    await act(async () => root.render(<NoteComposer onCreated={vi.fn()} />));
    await type("가족한테만");
    await settle();
    expect(stored()).toHaveLength(1);
    const select = host.querySelector<HTMLSelectElement>("[data-note-destination]")!;
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(["destinationMine", "우리 가족"]);
    await act(async () => {
      select.value = "5";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await settle();
    expect(stored()).toEqual([]);
    expect(host.querySelector("[data-note-room-audience]")).not.toBeNull();
    await act(async () => button("postToRoom")!.click());
    expect(mocks.createNote).toHaveBeenCalledWith(expect.objectContaining({ roomId: 5, visibility: null }));
  });

  it("offers no destination on a reply", async () => {
    await act(async () => root.render(<NoteComposer inReplyToId={3} onCreated={vi.fn()} />));
    await type("답글");
    expect(host.querySelector("[data-note-destination]")).toBeNull();
    expect(mocks.listMyRooms).not.toHaveBeenCalled();
  });
});
