import { afterEach, describe, expect, it, vi } from "vitest";
import { compareCampaignStats } from "./campaigns";

afterEach(() => vi.unstubAllGlobals());

describe("compareCampaignStats", () => {
  it("sends the ids as a JSON body, so the backend's @RequestBody does not answer 415", async () => {
    const fetchMock = vi.fn(
      async (..._args: [RequestInfo | URL, RequestInit?]) =>
        new Response(JSON.stringify({ campaigns: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await compareCampaignStats([1, 2]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/v1\/campaigns\/stats\/compare$/);
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(init?.body))).toEqual({ campaignIds: [1, 2] });
  });
});
