import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api/client", async (original) => ({
  ApiError: (await original<typeof import("@/lib/api/client")>()).ApiError,
  mockFailure: () => null,
  request: mocks.request,
}));
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

import { ApiError } from "@/lib/api/client";
import { getCollection } from "./collections";

beforeEach(() => vi.clearAllMocks());

describe("getCollection", () => {
  it("reads a missing collection as null", async () => {
    mocks.request.mockRejectedValueOnce(new ApiError(404, { status: 404 }));
    await expect(getCollection(9)).resolves.toBeNull();
  });

  it("lets any other failure through so the page can offer a retry", async () => {
    mocks.request.mockRejectedValueOnce(new ApiError(503, { status: 503 }));
    await expect(getCollection(9)).rejects.toBeInstanceOf(ApiError);
  });
});
