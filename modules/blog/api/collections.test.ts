import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api/client", async (original) => ({
  ApiError: (await original<typeof import("@/lib/api/client")>()).ApiError,
  mockFailure: () => null,
  request: mocks.request,
}));
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

import { ApiError } from "@/lib/api/client";
import { createCollection, getCollection, isOrdered, updateCollection } from "./collections";

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

describe("ordered collections", () => {
  it("reads `ordered` when the server sends it, and the legacy PATH kind when it doesn't", () => {
    expect(isOrdered({ ordered: true, kind: "COLLECTION" })).toBe(true);
    expect(isOrdered({ ordered: false, kind: "PATH" })).toBe(false);
    expect(isOrdered({ kind: "PATH" })).toBe(true);
    expect(isOrdered({ kind: "COLLECTION" })).toBe(false);
    expect(isOrdered({ ordered: null, kind: "PATH" })).toBe(true);
  });

  it("creates with `ordered` and the matching legacy kind, so a server before #807 still gets it right", async () => {
    mocks.request.mockResolvedValue({});
    await createCollection({ title: "느린 사고", visibility: "PRIVATE", ordered: true });
    expect(mocks.request).toHaveBeenLastCalledWith("/api/v1/collections", {
      method: "POST",
      body: { title: "느린 사고", visibility: "PRIVATE", ordered: true, kind: "PATH" },
    });
    await createCollection({ title: "모음", visibility: "PUBLIC", ordered: false });
    expect(mocks.request).toHaveBeenLastCalledWith("/api/v1/collections", {
      method: "POST",
      body: { title: "모음", visibility: "PUBLIC", ordered: false, kind: "COLLECTION" },
    });
  });

  it("sends the order setting on edit", async () => {
    mocks.request.mockResolvedValue({});
    await updateCollection(7, { title: "t", description: null, visibility: "PUBLIC", ordered: true });
    expect(mocks.request).toHaveBeenLastCalledWith("/api/v1/collections/7", {
      method: "PUT",
      body: { title: "t", description: null, visibility: "PUBLIC", ordered: true },
    });
  });
});
