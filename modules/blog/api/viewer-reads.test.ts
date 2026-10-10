import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ token: null as string | null, fetchWithTimeout: vi.fn() }));
vi.mock("@/lib/api/client", () => ({
  readToken: () => mocks.token,
  freshToken: async () => mocks.token,
  request: vi.fn(),
}));
vi.mock("@/lib/api/fetch-timeout", () => ({ fetchWithTimeout: mocks.fetchWithTimeout }));
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const fetchSpy = vi.fn(async () => json([]));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.token = null;
  vi.stubGlobal("fetch", fetchSpy);
  mocks.fetchWithTimeout.mockImplementation(async () => json({ items: [], hasNext: false, page: 0, size: 6 }));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const reads = [
  ["comments", async () => (await import("./comments")).listComments(7), "/api/v1/public/posts/7/comments"],
  ["highlights", async () => (await import("./highlights")).listHighlights(7), "/api/v1/public/posts/7/highlights"],
  ["highlight replies", async () => (await import("./highlights")).listHighlightReplies(41), "/api/v1/public/highlights/41/replies"],
] as const;

describe("reading surfaces the server filters per reader", () => {
  for (const [name, read, path] of reads) {
    it(`${name} carry the signed-in reader's token`, async () => {
      mocks.token = "access-token";
      await read();
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(path),
        expect.objectContaining({ cache: "no-store", headers: { Authorization: "Bearer access-token" } }),
      );
    });

    it(`${name} go out without a token for a visitor`, async () => {
      await read();
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining(path), expect.objectContaining({ headers: undefined }));
    });
  }

  it("the connection stream carries the token from the browser and stays ISR for a visitor", async () => {
    const { fetchPublicConnectionFeed } = await import("./collections");
    mocks.token = "access-token";
    await fetchPublicConnectionFeed(0, 6);
    expect(mocks.fetchWithTimeout).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/v1/public/feed/connections?page=0&size=6"),
      { cache: "no-store", headers: { Authorization: "Bearer access-token" } },
    );

    mocks.token = null;
    await fetchPublicConnectionFeed(0, 6);
    expect(mocks.fetchWithTimeout).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/v1/public/feed/connections?page=0&size=6"),
      { next: { revalidate: 30 } },
    );
  });
});

describe("a failed conversation read is an error, not an empty conversation", () => {
  const conversations = [
    ["comments", async () => (await import("./comments")).listComments(7)],
    ["highlight replies", async () => (await import("./highlights")).listHighlightReplies(41)],
  ] as const;

  for (const [name, read] of conversations) {
    it(`${name} reject on a server error`, async () => {
      fetchSpy.mockImplementationOnce(async () => new Response("", { status: 500 }));
      await expect(read()).rejects.toThrow("500");
    });
  }
});
