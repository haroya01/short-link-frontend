import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchWithTimeout: vi.fn() }));
vi.mock("@/lib/api/fetch-timeout", () => ({ fetchWithTimeout: mocks.fetchWithTimeout, isTimeoutError: () => false }));

const HINT = "kurl_has_session";

async function client() {
  vi.resetModules();
  return import("./client");
}

const hinted = () => document.cookie.split("; ").includes(`${HINT}=1`);

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  document.cookie = `${HINT}=1; path=/`;
});

describe("the session hint after a refresh that fails on load", () => {
  it("goes away when the server says the session is gone, so the next load asks nothing", async () => {
    mocks.fetchWithTimeout.mockResolvedValue(new Response(null, { status: 401 }));
    const first = await client();
    expect(await first.bootstrapSession()).toBe(false);
    expect(hinted()).toBe(false);

    const next = await client();
    expect(await next.bootstrapSession()).toBe(false);
    expect(mocks.fetchWithTimeout).toHaveBeenCalledTimes(1);
  });

  it("stays when the refresh only failed for now, so a live session is still recovered later", async () => {
    for (const failure of [new Response(null, { status: 503 }), new Response(null, { status: 429 })]) {
      mocks.fetchWithTimeout.mockResolvedValueOnce(failure);
      const { bootstrapSession } = await client();
      expect(await bootstrapSession()).toBe(false);
      expect(hinted()).toBe(true);
    }
    mocks.fetchWithTimeout.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { bootstrapSession } = await client();
    expect(await bootstrapSession()).toBe(false);
    expect(hinted()).toBe(true);
  });
});
