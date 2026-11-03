import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { NoteThread } from "@/modules/notes/api/notes";

const mocks = vi.hoisted(() => ({
  getNoteThread: vi.fn(),
  replace: vi.fn(),
  auth: { ready: true, authenticated: true },
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    values ? `${key}:${Object.values(values).join(",")}` : key,
  useLocale: () => "ko",
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ username: "yuna", id: "91" }),
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/modules/notes/api/notes", () => ({ getNoteThread: mocks.getNoteThread }));
vi.mock("@/modules/notes/components/note-thread", () => ({
  NoteThreadView: ({ initial }: { initial: NoteThread }) => createElement("article", { "data-note": initial.note.id }, initial.note.body),
}));

import { ApiError } from "@/lib/api/client";
import { NoteGate } from "./note-gate";

const thread = (username: string) =>
  ({
    note: { id: 91, body: "@dohyun 알림 가나요?", author: { id: 15, username, avatarUrl: null } },
    parent: null,
    replies: [],
    continuation: [],
    series: null,
  }) as unknown as NoteThread;

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth = { ready: true, authenticated: true };
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
  await act(async () => root.render(createElement(NoteGate, null, createElement("h1", null, "not found"))));
}

it("shows the note to a reader the server lets in", async () => {
  mocks.getNoteThread.mockResolvedValue(thread("yuna"));
  await render();

  expect(host.querySelector("[data-note='91']")?.textContent).toBe("@dohyun 알림 가나요?");
  expect(host.textContent).not.toContain("not found");
  expect(document.title).toBe("noteBy:yuna");
});

it("falls back to the 404 page when the signed-in read is a 404 too", async () => {
  mocks.getNoteThread.mockRejectedValue(new ApiError(404, { status: 404, code: "NOTE_NOT_FOUND" } as never));
  await render();

  expect(host.textContent).toBe("not found");
});

it("never asks the server for a signed-out reader", async () => {
  mocks.auth = { ready: true, authenticated: false };
  await render();

  expect(mocks.getNoteThread).not.toHaveBeenCalled();
  expect(host.textContent).toBe("not found");
});

it("says the read failed and tries again, instead of calling an outage a 404", async () => {
  mocks.getNoteThread.mockRejectedValueOnce(new ApiError(503, { status: 503 } as never)).mockResolvedValue(thread("yuna"));
  await render();

  expect(host.textContent).not.toContain("not found");
  const retry = host.querySelector<HTMLButtonElement>("[data-testid='error-state'] button")!;
  await act(async () => retry.click());

  expect(mocks.getNoteThread).toHaveBeenCalledTimes(2);
  expect(host.querySelector("[data-note='91']")).not.toBeNull();
});

it("moves to the writer's own address when the name in it is someone else's", async () => {
  mocks.getNoteThread.mockResolvedValue(thread("haruka"));
  await render();

  expect(mocks.replace).toHaveBeenCalledWith("/ko/p/haruka/notes/91");
});
