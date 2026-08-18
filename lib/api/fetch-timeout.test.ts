import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_FETCH_TIMEOUT_MS, fetchWithTimeout, isTimeoutError } from "@/lib/api/fetch-timeout";

describe("fetchWithTimeout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("aborts a hung request at the timeout instead of hanging forever", async () => {
    // A fetch that only settles when its signal aborts — models the backend never answering.
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: unknown, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal!.reason ?? new DOMException("aborted", "AbortError")),
          );
        });
      }),
    );

    const err = await fetchWithTimeout("https://api.example/slow", {}, 30).catch((e) => e);
    expect(isTimeoutError(err)).toBe(true);
  });

  it("passes a fast response straight through", async () => {
    const ok = new Response("hi", { status: 200 });
    vi.stubGlobal("fetch", vi.fn(async () => ok));

    const res = await fetchWithTimeout("https://api.example/fast", {}, 5000);
    expect(res.status).toBe(200);
  });

  it("opts out of the timeout when timeoutMs <= 0 (no signal injected)", async () => {
    const seen: (AbortSignal | undefined | null)[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        seen.push(init?.signal);
        return new Response(null, { status: 204 });
      }),
    );

    await fetchWithTimeout("https://api.example/export", {}, 0);
    expect(seen[0]).toBeUndefined();
  });

  it("honors a caller signal alongside the timeout (caller abort wins)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: unknown, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        });
      }),
    );

    const controller = new AbortController();
    const p = fetchWithTimeout("https://api.example/slow", { signal: controller.signal }, 10_000);
    controller.abort();
    await expect(p).rejects.toBeInstanceOf(DOMException);
  });

  it("uses an 8s default ceiling", () => {
    expect(DEFAULT_FETCH_TIMEOUT_MS).toBe(8000);
  });
});
