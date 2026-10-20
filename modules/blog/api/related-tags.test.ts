import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchWithTimeout: vi.fn() }));
vi.mock("@/lib/api/fetch-timeout", () => ({ fetchWithTimeout: mocks.fetchWithTimeout, isTimeoutError: () => false }));
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

afterEach(() => vi.clearAllMocks());

describe("listRelatedTags", () => {
  it("asks for the query's neighbours and hands back the tags", async () => {
    mocks.fetchWithTimeout.mockResolvedValue(new Response(JSON.stringify({ tags: [{ tag: "Spring", posts: 3, notes: 1 }] }), { status: 200 }));
    const { listRelatedTags } = await import("./public-posts");
    expect(await listRelatedTags(" #Java 백엔드 ")).toEqual([{ tag: "Spring", posts: 3, notes: 1 }]);
    expect(mocks.fetchWithTimeout.mock.calls[0][0]).toMatch(/\/api\/v1\/public\/search\/related\?q=%23Java%20%EB%B0%B1%EC%97%94%EB%93%9C&limit=8$/);
  });

  it("asks nothing for a one-letter query", async () => {
    const { listRelatedTags } = await import("./public-posts");
    expect(await listRelatedTags("a")).toEqual([]);
    expect(mocks.fetchWithTimeout).not.toHaveBeenCalled();
  });

  it("shows nothing when the server has no such endpoint or fails", async () => {
    const { listRelatedTags } = await import("./public-posts");
    mocks.fetchWithTimeout.mockResolvedValueOnce(new Response("{}", { status: 404 }));
    expect(await listRelatedTags("java")).toEqual([]);
    mocks.fetchWithTimeout.mockResolvedValueOnce(new Response("{}", { status: 500 }));
    expect(await listRelatedTags("java")).toEqual([]);
  });
});
