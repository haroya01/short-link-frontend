import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./public-posts", () => ({ hasViewer: () => false, viewerHeaders: async () => undefined }));
vi.mock("@/modules/blog/lib/post-access", () => ({
  announcePostLocked: vi.fn(),
  postAccessHeaders: () => undefined,
  withPostAccess: (headers: HeadersInit | undefined) => headers,
}));

import { listCommentPage } from "./comments";

const comment = (id: number, parentId: number | null = null) => ({ id, parentId, author: null, body: `${id}`, createdAt: "", likeCount: 0 });

describe("listCommentPage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("asks for one page of top-level comments, or for what came after a cursor", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ items: [comment(1)], next: "1", latest: "9", total: 64 })));
    expect(await listCommentPage(7, { cursor: "40" })).toEqual({ items: [comment(1)], next: "1", latest: "9", total: 64 });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/public/posts/7/comments/page?limit=20&tombstones=1&cursor=40");
    await listCommentPage(7, { after: "9", limit: 50 });
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/public/posts/7/comments/page?limit=50&tombstones=1&after=9");
  });

  it("reads an empty next as the end, a numeric latest as a string, and a missing total as unknown", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [], next: "", latest: 12 })));
    expect(await listCommentPage(7, {})).toEqual({ items: [], next: null, latest: "12", total: null });
  });

  it("answers null when the server predates pages, so the screen falls back to the whole list", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 404 }));
    expect(await listCommentPage(7, {})).toBeNull();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([comment(1), comment(2, 1)])));
    expect(await listCommentPage(7, {})).toBeNull();
  });

  it("still fails loudly on other errors", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 500 }));
    await expect(listCommentPage(7, {})).rejects.toThrow("comments 500");
  });
});
