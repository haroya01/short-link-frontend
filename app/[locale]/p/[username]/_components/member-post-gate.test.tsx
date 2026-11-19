import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PublicPostDetail } from "@/modules/blog/api/public-posts";

const mocks = vi.hoisted(() => ({
  readPostDetail: vi.fn(),
  params: { username: "yuki_dev", slug: "rainy-mt-night" },
  auth: { ready: true, authenticated: true },
  header: vi.fn(),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useLocale: () => "ko" }));
vi.mock("next/navigation", () => ({ useParams: () => mocks.params }));
vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/modules/blog/api/public-posts", () => ({ readPostDetail: mocks.readPostDetail }));
vi.mock("@/modules/blog/components/author-gate", () => ({
  AuthorGate: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("./post-chrome", () => ({
  POST_ARTICLE: "",
  POST_PAGE_GRID: "",
  PostAuthorRail: () => null,
  PostHeader: (props: { title: string; actions: { room?: { id: number } | null } | null }) => {
    mocks.header(props);
    return createElement("h1", null, props.title);
  },
}));
vi.mock("./unlocked-article", () => ({
  UnlockedArticle: ({ detail }: { detail: PublicPostDetail }) =>
    createElement("section", { "data-body": detail.post.id }, detail.blocks[0]?.content),
}));

import { MemberPostGate } from "./member-post-gate";

const CLUB = { id: 1, name: "동아리 사람들" };
const detail = (over: Partial<PublicPostDetail["post"]> = {}): PublicPostDetail => ({
  author: { id: 2, username: "yuki_dev", bio: null, avatarUrl: null },
  post: {
    id: 8801, slug: "rainy-mt-night", title: "비 오던 엠티의 밤", excerpt: null, ogImageUrl: null, languageTag: "ko",
    tags: [], likeCount: 2, publishedAt: "2026-11-19T09:00:00Z", lastEditedAt: null, pinned: false,
    audience: "ROOM", room: CLUB, ...over,
  },
  blocks: [{ type: "PARAGRAPH", content: "펜션 지붕을 두드리던 빗소리", blockOrder: 0, cta: null }],
  series: null,
});

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth = { ready: true, authenticated: true };
  mocks.params = { username: "yuki_dev", slug: "rainy-mt-night" };
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
  await act(async () =>
    root.render(
      <MemberPostGate colophon={<p>colophon</p>}>
        <h1>not found</h1>
      </MemberPostGate>,
    ),
  );
}

const notFound = () => host.querySelector<HTMLElement>("div:has(> h1)");

it("opens a room's post for a reader the server lets in, in that room", async () => {
  mocks.readPostDetail.mockResolvedValue({ ok: true, data: detail() });
  await render();

  expect(mocks.readPostDetail).toHaveBeenCalledWith("yuki_dev", "rainy-mt-night", {});
  expect(host.querySelector("[data-body='8801']")?.textContent).toBe("펜션 지붕을 두드리던 빗소리");
  expect(host.textContent).not.toContain("not found");
  expect(host.textContent).toContain("colophon");
  expect(mocks.header.mock.calls.at(-1)![0].actions.room).toEqual(CLUB);
  expect(document.title).toBe("비 오던 엠티의 밤");
});

it("stays the 404 page when the signed-in read is a 404 too", async () => {
  mocks.readPostDetail.mockResolvedValue({ ok: false, status: 404 });
  await render();

  expect(host.textContent).toBe("not found");
  expect(notFound()!.className).toBe("contents");
});

it("stays the 404 page when the server answers with a locked card", async () => {
  mocks.readPostDetail.mockResolvedValue({ ok: true, data: detail({ audience: "FOLLOWERS", room: null, locked: { reason: "FOLLOWERS" } }) });
  await render();

  expect(host.textContent).toBe("not found");
  expect(host.querySelector("[data-body]")).toBeNull();
});

it("stays the 404 page for a post outside rooms, whatever the signed-in read returns", async () => {
  mocks.readPostDetail.mockResolvedValue({ ok: true, data: detail({ audience: "PUBLIC", room: null }) });
  await render();

  expect(host.textContent).toBe("not found");
  expect(host.querySelector("[data-body]")).toBeNull();
});

it("never asks the server for a signed-out reader", async () => {
  mocks.auth = { ready: true, authenticated: false };
  await render();

  expect(mocks.readPostDetail).not.toHaveBeenCalled();
  expect(host.textContent).toBe("not found");
  expect(notFound()!.className).toBe("contents");
});

it("keeps the 404 page out of sight while a signed-in reader's read is on its way", async () => {
  mocks.readPostDetail.mockReturnValue(new Promise(() => {}));
  await render();

  expect(notFound()!.className).toBe("hidden");
  expect(host.querySelector("main[aria-busy]")).not.toBeNull();
});

it("before the session is known, leaves both the 404 page and the wait to the auth hint", async () => {
  mocks.auth = { ready: false, authenticated: false };
  await render();

  expect(mocks.readPostDetail).not.toHaveBeenCalled();
  expect(notFound()!.dataset.authSlot).toBe("anon");
  expect(host.querySelector<HTMLElement>("[data-auth-slot='authed'] main[aria-busy]")).not.toBeNull();
});

it("says the read failed and tries again, instead of calling an outage a 404", async () => {
  mocks.readPostDetail.mockResolvedValueOnce({ ok: false, status: "error" }).mockResolvedValue({ ok: true, data: detail() });
  await render();

  expect(host.textContent).not.toContain("not found");
  const retry = host.querySelector<HTMLButtonElement>("[data-testid='error-state'] button")!;
  await act(async () => retry.click());

  expect(mocks.readPostDetail).toHaveBeenCalledTimes(2);
  expect(host.querySelector("[data-body='8801']")).not.toBeNull();
});

it("asks with the address as written, not as the browser encoded it", async () => {
  mocks.params = { username: "yuki_dev", slug: "%EB%B9%84-%EC%98%A4%EB%8D%98-%EB%B0%A4" };
  mocks.readPostDetail.mockResolvedValue({ ok: false, status: 404 });
  await render();

  expect(mocks.readPostDetail).toHaveBeenCalledWith("yuki_dev", "비-오던-밤", {});
});
