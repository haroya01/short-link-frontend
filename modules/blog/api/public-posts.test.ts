import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchWithTimeout: vi.fn(), readToken: vi.fn() }));
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));
vi.mock("@/lib/api/fetch-timeout", () => ({ fetchWithTimeout: mocks.fetchWithTimeout }));
vi.mock("@/lib/api/client", () => ({ readToken: mocks.readToken }));

const ok = () => new Response(JSON.stringify({ items: [], page: 0, size: 24, hasNext: false }), { status: 200 });

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.fetchWithTimeout.mockImplementation(async () => ok());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("public discovery fetches", () => {
  it("carry a signed-in reader's token from the browser, uncached", async () => {
    mocks.readToken.mockReturnValue("access-token");
    const { listPublicFeed } = await import("./public-posts");
    await listPublicFeed("trending", 0, 24);
    expect(mocks.fetchWithTimeout).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/public/posts?sort=trending&page=0&size=24"),
      { cache: "no-store", headers: { Authorization: "Bearer access-token" } },
    );
  });

  it("stay anonymous and ISR-cached for a visitor", async () => {
    mocks.readToken.mockReturnValue(null);
    const { listSuggestedAuthors } = await import("./public-posts");
    await listSuggestedAuthors(5);
    expect(mocks.fetchWithTimeout).toHaveBeenCalledWith(expect.stringContaining("/api/v1/public/authors?limit=5"), {
      next: { revalidate: 30 },
    });
  });

  it("never send a token from a server render, so a cached page is nobody's own list", async () => {
    vi.stubGlobal("window", undefined);
    mocks.readToken.mockReturnValue("leaked-token");
    const { listFeedByTag } = await import("./public-posts");
    await listFeedByTag("일상", "trending", 0, 24);
    expect(mocks.readToken).not.toHaveBeenCalled();
    expect(mocks.fetchWithTimeout).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/public/posts?tag=%EC%9D%BC%EC%83%81&sort=trending"),
      { next: { revalidate: 30 } },
    );
  });
});
