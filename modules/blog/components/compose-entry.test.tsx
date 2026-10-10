import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostView } from "@/modules/blog/api/posts";

const mocks = vi.hoisted(() => ({
  listMyPosts: vi.fn(),
  noteDialog: vi.fn(),
  onPosted: null as ((note: unknown) => void) | null,
  toast: vi.fn(),
  push: vi.fn(),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useLocale: () => "ko" }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/modules/blog/api/posts", () => ({ listMyPosts: mocks.listMyPosts }));
vi.mock("@/modules/notes/components/note-quote-dialog", () => ({
  NoteQuoteDialog: (props: { quoted: unknown; onPosted: (note: unknown) => void }) => {
    mocks.noteDialog(props.quoted);
    mocks.onPosted = props.onPosted;
    return props.quoted ? createElement("div", { "data-testid": "note-dialog" }) : null;
  },
}));

import { ComposeEntry, recentDrafts } from "./compose-entry";

const post = (id: number, status: PostView["status"], updatedAt: string, title = `글 ${id}`) =>
  ({ id, status, updatedAt, title }) as PostView;

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.listMyPosts.mockResolvedValue([]);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

async function render(variant: "desktop" | "mobile") {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root.render(
      <ComposeEntry variant={variant} label="글쓰기" className="trigger">
        글쓰기
      </ComposeEntry>,
    ),
  );
}

const trigger = () => document.querySelector<HTMLButtonElement>("[data-compose-trigger]")!;
const choices = () => [...document.querySelectorAll<HTMLElement>("[data-compose-choice]")];
const open = async () => {
  await act(async () => trigger().click());
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};
const key = async (k: string) =>
  act(async () => {
    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
  });

describe("recentDrafts", () => {
  it("keeps the three most recently edited drafts and says when there are more", () => {
    const posts = [
      post(1, "DRAFT", "2026-10-01T00:00:00Z"),
      post(2, "PUBLISHED", "2026-10-09T00:00:00Z"),
      post(3, "DRAFT", "2026-10-05T00:00:00Z"),
      post(4, "DRAFT", "2026-10-08T00:00:00Z"),
      post(5, "DRAFT", "2026-10-03T00:00:00Z"),
    ];
    const { items, more } = recentDrafts(posts);
    expect(items.map((p) => p.id)).toEqual([4, 3, 5]);
    expect(more).toBe(true);
    expect(recentDrafts(posts.slice(0, 2)).more).toBe(false);
  });
});

describe("the 글쓰기 chooser", () => {
  it("opens a menu on desktop with 노트 and 긴 글, keyboard-navigable, and Escape returns focus to the button", async () => {
    await render("desktop");
    expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
    await open();
    const menu = document.querySelector('[role="menu"]')!;
    expect(menu.getAttribute("aria-label")).toBe("title");
    expect(choices().map((c) => c.dataset.composeChoice)).toEqual(["note", "longform"]);
    expect(choices().every((c) => c.getAttribute("role") === "menuitem")).toBe(true);
    expect(document.activeElement).toBe(choices()[0]);
    await key("ArrowDown");
    expect(document.activeElement).toBe(choices()[1]);
    await key("ArrowDown");
    expect(document.activeElement).toBe(choices()[0]);
    await key("Escape");
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it("lists recent drafts under 이어 쓰기 with an untitled fallback, and 모두 보기 only when there are more", async () => {
    mocks.listMyPosts.mockResolvedValue([
      post(11, "DRAFT", "2026-10-09T00:00:00Z", "  "),
      post(12, "DRAFT", "2026-10-08T00:00:00Z", "초안 둘"),
      post(13, "DRAFT", "2026-10-07T00:00:00Z", "초안 셋"),
      post(14, "DRAFT", "2026-10-06T00:00:00Z", "초안 넷"),
    ]);
    await render("desktop");
    await open();
    expect(document.querySelector('[role="group"]')).not.toBeNull();
    expect(choices().map((c) => c.dataset.composeChoice)).toEqual([
      "note",
      "longform",
      "draft-11",
      "draft-12",
      "draft-13",
      "all-drafts",
    ]);
    const first = choices()[2];
    expect(first.textContent).toContain("untitled");
    expect(first.getAttribute("href")).toContain("/write/11");
    expect(choices()[5].getAttribute("href")).toMatch(/\/write$/);
  });

  it("hides 이어 쓰기 when there are no drafts", async () => {
    mocks.listMyPosts.mockResolvedValue([post(1, "PUBLISHED", "2026-10-01T00:00:00Z")]);
    await render("desktop");
    await open();
    expect(document.querySelector('[role="group"]')).toBeNull();
    expect(choices()).toHaveLength(2);
  });

  it("노트 opens the note composer and puts focus back on the button", async () => {
    await render("desktop");
    await open();
    await act(async () => choices()[0].click());
    expect(document.querySelector('[data-testid="note-dialog"]')).not.toBeNull();
    expect(mocks.noteDialog).toHaveBeenLastCalledWith({ fresh: true, title: "noteTitle" });
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it("a posted note toasts with 보기, which opens the new note", async () => {
    await render("desktop");
    await open();
    await act(async () => choices()[0].click());
    await act(async () => mocks.onPosted!({ id: 77, author: { username: "dohyun" } }));
    expect(mocks.toast).toHaveBeenCalledWith("notePosted", "default", {
      action: { label: "viewNote", onClick: expect.any(Function) },
    });
    mocks.toast.mock.calls[0][2].action.onClick();
    expect(mocks.push).toHaveBeenCalledWith(expect.stringMatching(/dohyun.*\/notes\/77$/));
  });

  it("opens a bottom sheet dialog on mobile with the same choices", async () => {
    mocks.listMyPosts.mockResolvedValue([post(21, "DRAFT", "2026-10-09T00:00:00Z", "작성 중인 초안")]);
    await render("mobile");
    expect(trigger().getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger().getAttribute("aria-label")).toBe("글쓰기");
    await open();
    const sheet = document.querySelector('[role="dialog"]')!;
    expect(sheet.getAttribute("aria-label")).toBe("title");
    expect(choices().map((c) => c.dataset.composeChoice)).toEqual(["note", "longform", "draft-21"]);
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });
});
