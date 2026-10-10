import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ request: mocks.request, mockFailure: () => null }));

import { getNotifications } from "./notifications";

beforeEach(() => {
  mocks.request.mockReset();
  mocks.request.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
});

describe("getNotifications", () => {
  it("asks for everything without a filter", async () => {
    await getNotifications(undefined, 20);
    expect(mocks.request).toHaveBeenCalledWith("/api/v1/notifications?limit=20", { method: "GET" });
  });

  it("narrows to mentions and replies with the same cursor", async () => {
    await getNotifications(41, 20, "mentions");
    expect(mocks.request).toHaveBeenCalledWith("/api/v1/notifications?before=41&limit=20&filter=mentions", {
      method: "GET",
    });
  });
});
