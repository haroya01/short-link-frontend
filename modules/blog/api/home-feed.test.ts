import { afterEach, describe, expect, it, vi } from "vitest";

const fetchPublic = vi.fn();

vi.mock("./public-posts", () => ({
  fetchPublic: (...args: unknown[]) => fetchPublic(...args),
  hasViewer: () => false,
  PUBLIC_POSTS_TAG: "public-posts",
}));

import { listHome } from "./home-feed";

const note = { id: 1, body: "노트" };
const post = { id: 2, title: "글", author: { username: "minji" }, readMinutes: 3, commentCount: 0, likedByMe: null };

afterEach(() => fetchPublic.mockReset());

describe("the home feed", () => {
  it("asks /public/home with the tab and the cursor it was given", async () => {
    fetchPublic.mockResolvedValue({ ok: true, data: { items: [], next: null } });
    await listHome("latest");
    await listHome("following", "12.8", 40);
    expect(fetchPublic.mock.calls.map(([path]) => path)).toEqual([
      "/api/v1/public/home?tab=latest&limit=20",
      "/api/v1/public/home?tab=following&limit=40&cursor=12.8",
    ]);
  });

  it("keeps notes and posts in order and drops items it does not know", async () => {
    fetchPublic.mockResolvedValue({
      ok: true,
      data: {
        items: [{ kind: "note", note }, { kind: "room", room: {} }, { kind: "post", post }, { kind: "note" }],
        next: "3.1",
      },
    });
    await expect(listHome("latest")).resolves.toEqual({
      ok: true,
      data: { items: [{ kind: "note", note }, { kind: "post", post }], next: "3.1" },
    });
  });

  it("reads a missing or empty next as the end, and a body without items as nothing", async () => {
    fetchPublic.mockResolvedValue({ ok: true, data: { items: [{ kind: "note", note }], next: "" } });
    await expect(listHome("latest")).resolves.toEqual({ ok: true, data: { items: [{ kind: "note", note }], next: null } });
    fetchPublic.mockResolvedValue({ ok: true, data: {} });
    await expect(listHome("trending")).resolves.toEqual({ ok: true, data: { items: [], next: null } });
  });

  it("passes a failure through so the feed can say so", async () => {
    fetchPublic.mockResolvedValue({ ok: false, status: "error" });
    await expect(listHome("latest")).resolves.toEqual({ ok: false, status: "error" });
  });
});
