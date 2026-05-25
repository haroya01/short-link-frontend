import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * pow.ts keeps a single prewarm slot at the module level — same isolation strategy as the
 * api.ts tests: {@code vi.resetModules()} + dynamic import so each case gets a fresh slot.
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

function stubChallenges(...bodies: { challenge: string; difficulty: number; enforced: boolean }[]) {
  const mock = vi.fn();
  for (const body of bodies) {
    mock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => body });
  }
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("getPowToken — enforcement gate", () => {
  it("returns null when the backend reports enforced: false (no mining needed)", async () => {
    stubChallenges({ challenge: "abc", difficulty: 4, enforced: false });
    const { getPowToken } = await freshPow();
    const token = await getPowToken();
    expect(token).toBeNull();
  });

  it("mines a nonce and returns the pair when enforced: true (difficulty 0 → first try wins)", async () => {
    stubChallenges({ challenge: "ch-1", difficulty: 0, enforced: true });
    const { getPowToken } = await freshPow();
    const token = await getPowToken();
    expect(token).toEqual({ challenge: "ch-1", nonce: "0" });
  });
});

describe("getPowToken — atomic prewarm consume", () => {
  it("returns a fresh token on every call when prewarm is not used", async () => {
    const fetchMock = stubChallenges(
      { challenge: "a", difficulty: 0, enforced: true },
      { challenge: "b", difficulty: 0, enforced: true },
    );
    const { getPowToken } = await freshPow();
    const a = await getPowToken();
    const b = await getPowToken();
    expect(a?.challenge).toBe("a");
    expect(b?.challenge).toBe("b");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("prewarmPowToken seeds one slot that the next getPowToken consumes", async () => {
    const fetchMock = stubChallenges(
      { challenge: "warm", difficulty: 0, enforced: true },
      { challenge: "fresh", difficulty: 0, enforced: true },
    );
    const { getPowToken, prewarmPowToken } = await freshPow();
    prewarmPowToken();
    const a = await getPowToken();
    expect(a?.challenge).toBe("warm");
    const b = await getPowToken();
    expect(b?.challenge).toBe("fresh");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("concurrent callers each get a unique token — only one claims the prewarm slot", async () => {
    // Three concurrent callers + one prewarm: one claims, two mine fresh → three distinct challenges,
    // three fetch calls. This is the multi-channel race that motivated the fix.
    const fetchMock = stubChallenges(
      { challenge: "warm", difficulty: 0, enforced: true },
      { challenge: "fresh-1", difficulty: 0, enforced: true },
      { challenge: "fresh-2", difficulty: 0, enforced: true },
    );
    const { getPowToken, prewarmPowToken } = await freshPow();
    prewarmPowToken();
    const [a, b, c] = await Promise.all([getPowToken(), getPowToken(), getPowToken()]);
    const challenges = [a?.challenge, b?.challenge, c?.challenge].sort();
    expect(challenges).toEqual(["fresh-1", "fresh-2", "warm"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("prewarmPowToken called twice does not double-fetch — second call is a no-op while the slot is full", async () => {
    const fetchMock = stubChallenges({ challenge: "only", difficulty: 0, enforced: true });
    const { getPowToken, prewarmPowToken } = await freshPow();
    prewarmPowToken();
    prewarmPowToken();
    const a = await getPowToken();
    expect(a?.challenge).toBe("only");
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
