import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * pow.ts caches a Promise at the module level — same isolation strategy as the api.ts tests:
 * {@code vi.resetModules()} + dynamic import so each case gets a fresh cache.
 */
async function freshPow() {
  vi.resetModules();
  return await import("./pow");
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubChallenge(body: { challenge?: string; difficulty?: number; enforced?: boolean }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => body,
    }),
  );
}

describe("getPowToken — enforcement gate", () => {
  it("returns null when the backend reports enforced: false (no mining needed)", async () => {
    stubChallenge({ challenge: "abc", difficulty: 4, enforced: false });
    const { getPowToken } = await freshPow();
    const token = await getPowToken();
    expect(token).toBeNull();
  });

  it("mines a nonce and returns the pair when enforced: true (difficulty 0 → first try wins)", async () => {
    // difficulty 0 makes the prefix "" — every hash matches → the mining loop exits at nonce 0.
    // This keeps the test fast without depending on crypto.subtle output bytes.
    stubChallenge({ challenge: "ch-1", difficulty: 0, enforced: true });
    const { getPowToken } = await freshPow();
    const token = await getPowToken();
    expect(token).toEqual({ challenge: "ch-1", nonce: "0" });
  });
});

describe("getPowToken — caching", () => {
  it("caches the promise across calls — only one challenge fetch per module lifetime", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ challenge: "ch-cache", difficulty: 0, enforced: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { getPowToken } = await freshPow();
    const a = await getPowToken();
    const b = await getPowToken();
    expect(a).toEqual(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clearPowToken invalidates the cache so the next call re-mines", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ challenge: "first", difficulty: 0, enforced: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ challenge: "second", difficulty: 0, enforced: true }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const { getPowToken, clearPowToken } = await freshPow();
    const a = await getPowToken();
    expect(a?.challenge).toBe("first");
    clearPowToken();
    const b = await getPowToken();
    expect(b?.challenge).toBe("second");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("getPowToken — error recovery", () => {
  it("returns null when the challenge fetch fails (network or non-200) — never throws to the caller", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );
    const { getPowToken } = await freshPow();
    const token = await getPowToken();
    expect(token).toBeNull();
  });

  it("returns null when fetch itself rejects (offline / DNS failure)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new Error("network down")),
    );
    const { getPowToken } = await freshPow();
    const token = await getPowToken();
    expect(token).toBeNull();
  });
});
