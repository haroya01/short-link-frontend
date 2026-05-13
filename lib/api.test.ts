import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "short-link:access-token";

/**
 * Token state lives in module-level singletons ({@code memoryToken} / {@code refreshInFlight}) so
 * we need a fresh module per test for isolation. {@code vi.resetModules()} + dynamic import gives
 * us that without leaking auth state between cases.
 */
async function freshApi() {
  vi.resetModules();
  return await import("./api");
}

beforeEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("ApiError", () => {
  it("uses detail.detail as the message when present", async () => {
    const { ApiError } = await freshApi();
    const err = new ApiError(400, { status: 400, detail: "bad request" });
    expect(err.message).toBe("bad request");
    expect(err.status).toBe(400);
  });

  it("falls back to detail.title when detail is missing", async () => {
    const { ApiError } = await freshApi();
    const err = new ApiError(404, { status: 404, title: "Not Found" });
    expect(err.message).toBe("Not Found");
  });

  it("falls back to HTTP {status} when neither detail nor title is set", async () => {
    const { ApiError } = await freshApi();
    const err = new ApiError(500, { status: 500 });
    expect(err.message).toBe("HTTP 500");
  });
});

describe("readToken", () => {
  it("returns null on a clean module + empty storage", async () => {
    const { readToken } = await freshApi();
    expect(readToken()).toBeNull();
  });

  it("returns the localStorage value on first read after a tab reload", async () => {
    window.localStorage.setItem(STORAGE_KEY, "stored-jwt");
    const { readToken } = await freshApi();
    expect(readToken()).toBe("stored-jwt");
  });

  it("caches the value in memory after the first read", async () => {
    window.localStorage.setItem(STORAGE_KEY, "first-read");
    const { readToken } = await freshApi();
    expect(readToken()).toBe("first-read");
    // External tampering doesn't invalidate the in-memory cache — readToken returns the cached
    // value, not whatever localStorage holds now. This is the intentional fast-path.
    window.localStorage.setItem(STORAGE_KEY, "changed-externally");
    expect(readToken()).toBe("first-read");
  });
});

describe("setToken", () => {
  it("writes to memory and localStorage", async () => {
    const { setToken, readToken } = await freshApi();
    setToken("new-jwt");
    expect(readToken()).toBe("new-jwt");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("new-jwt");
  });

  it("clears both memory and localStorage when called with null", async () => {
    const { setToken, readToken } = await freshApi();
    setToken("temp");
    setToken(null);
    expect(readToken()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("dispatches an 'auth:change' event so listeners can react", async () => {
    const { setToken } = await freshApi();
    const listener = vi.fn();
    window.addEventListener("auth:change", listener);
    setToken("new-jwt");
    setToken(null);
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener("auth:change", listener);
  });
});

describe("request — token + 401 refresh flow (via getMe)", () => {
  function mockFetchSequence(
    responses: Array<{ status: number; body?: object | string }>,
  ): ReturnType<typeof vi.fn> {
    const fn = vi.fn();
    for (const r of responses) {
      const text = typeof r.body === "string" ? r.body : JSON.stringify(r.body ?? null);
      fn.mockResolvedValueOnce({
        ok: r.status >= 200 && r.status < 300,
        status: r.status,
        statusText: "",
        text: async () => text,
        json: async () => r.body,
      });
    }
    return fn;
  }

  it("attaches Bearer token from readToken to outgoing requests", async () => {
    const { setToken, getMe } = await freshApi();
    setToken("my-token");
    const fetchMock = mockFetchSequence([{ status: 200, body: { id: 1, email: "a@b.com" } }]);
    vi.stubGlobal("fetch", fetchMock);
    await getMe();
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer my-token");
  });

  it("does not set Authorization when no token is stored", async () => {
    const { getMe } = await freshApi();
    const fetchMock = mockFetchSequence([{ status: 200, body: { id: 1, email: "a@b.com" } }]);
    vi.stubGlobal("fetch", fetchMock);
    await getMe();
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBeNull();
  });

  it("on 401, calls refresh and retries the original request with the new token", async () => {
    const { setToken, getMe } = await freshApi();
    setToken("expired");
    const fetchMock = mockFetchSequence([
      { status: 401, body: { status: 401, detail: "expired" } },
      { status: 200, body: { accessToken: "refreshed-jwt" } },
      { status: 200, body: { id: 1, email: "a@b.com" } },
    ]);
    vi.stubGlobal("fetch", fetchMock);
    const me = await getMe();
    expect(me).toMatchObject({ id: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // Second call hits /auth/refresh
    expect(String(fetchMock.mock.calls[1][0])).toContain("/auth/refresh");
    // Retry uses the refreshed token
    const retryHeaders = new Headers(fetchMock.mock.calls[2][1].headers);
    expect(retryHeaders.get("Authorization")).toBe("Bearer refreshed-jwt");
  });

  it("clears the token when 401 and refresh fails", async () => {
    const { setToken, readToken, getMe } = await freshApi();
    setToken("expired");
    const fetchMock = mockFetchSequence([
      { status: 401, body: { status: 401, detail: "expired" } },
      { status: 401, body: { status: 401, detail: "refresh failed" } },
    ]);
    vi.stubGlobal("fetch", fetchMock);
    await expect(getMe()).rejects.toMatchObject({ status: 401 });
    expect(readToken()).toBeNull();
  });

  it("returns undefined on 204 No Content", async () => {
    const { setToken, deleteWebhook } = await freshApi();
    setToken("t");
    const fetchMock = mockFetchSequence([{ status: 204, body: "" }]);
    vi.stubGlobal("fetch", fetchMock);
    await expect(deleteWebhook("abc", 1)).resolves.toBeUndefined();
  });

  it("throws ApiError with the server's ProblemDetail body on non-2xx", async () => {
    const { setToken, getMe, ApiError } = await freshApi();
    setToken("t");
    const fetchMock = mockFetchSequence([
      { status: 400, body: { status: 400, code: "BAD_INPUT", detail: "invalid x" } },
    ]);
    vi.stubGlobal("fetch", fetchMock);
    try {
      await getMe();
      throw new Error("expected ApiError");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as InstanceType<typeof ApiError>).status).toBe(400);
      expect((err as InstanceType<typeof ApiError>).detail).toMatchObject({
        status: 400,
        code: "BAD_INPUT",
        detail: "invalid x",
      });
    }
  });

  it("sends Content-Type: application/json when the body is a plain object", async () => {
    const { setToken, updateLink } = await freshApi();
    setToken("t");
    const fetchMock = mockFetchSequence([{ status: 204, body: "" }]);
    vi.stubGlobal("fetch", fetchMock);
    await updateLink("abc", { originalUrl: "https://example.com" });
    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(fetchMock.mock.calls[0][1].body).toBe(
      JSON.stringify({ originalUrl: "https://example.com" }),
    );
  });
});
