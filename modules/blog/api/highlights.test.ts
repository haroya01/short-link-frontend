import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ mockFailure: () => null, request: mocks.request }));
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

import { likeHighlightReply, unlikeHighlightReply } from "./highlights";

beforeEach(() => vi.clearAllMocks());

describe("a highlight reply's like", () => {
  it("is put on and taken off at the reply's like address, settling on the server's count", async () => {
    mocks.request.mockResolvedValueOnce({ likeCount: 3, liked: true });
    await expect(likeHighlightReply(6001)).resolves.toEqual({ likeCount: 3, liked: true });
    expect(mocks.request).toHaveBeenLastCalledWith("/api/v1/highlight-replies/6001/like", { method: "POST" });

    mocks.request.mockResolvedValueOnce({ likeCount: 2, liked: false });
    await expect(unlikeHighlightReply(6001)).resolves.toEqual({ likeCount: 2, liked: false });
    expect(mocks.request).toHaveBeenLastCalledWith("/api/v1/highlight-replies/6001/like", { method: "DELETE" });
  });
});
