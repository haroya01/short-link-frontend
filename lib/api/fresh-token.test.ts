import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchWithTimeout: vi.fn() }));
vi.mock("@/lib/api/fetch-timeout", () => ({ fetchWithTimeout: mocks.fetchWithTimeout, isTimeoutError: () => false }));

const KEY = "short-link:access-token";

function jwt(expSeconds: number): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "HS256" })}.${encode({ sub: "1", exp: expSeconds })}.signature`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

async function client() {
  vi.resetModules();
  return import("./client");
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("freshToken", () => {
  it("hands back a token that still has time left without asking for a new one", async () => {
    const token = jwt(nowSeconds() + 600);
    window.localStorage.setItem(KEY, token);
    const { freshToken } = await client();
    expect(await freshToken()).toBe(token);
    expect(mocks.fetchWithTimeout).not.toHaveBeenCalled();
  });

  it("refreshes a token that expires within 30 seconds and uses the new one", async () => {
    window.localStorage.setItem(KEY, jwt(nowSeconds() + 10));
    const renewed = jwt(nowSeconds() + 900);
    mocks.fetchWithTimeout.mockResolvedValue(new Response(JSON.stringify({ accessToken: renewed }), { status: 200 }));
    const { freshToken, readToken } = await client();
    expect(await freshToken()).toBe(renewed);
    expect(readToken()).toBe(renewed);
    expect(mocks.fetchWithTimeout).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/refresh"),
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("refreshes an already expired token too", async () => {
    window.localStorage.setItem(KEY, jwt(nowSeconds() - 3600));
    mocks.fetchWithTimeout.mockResolvedValue(new Response(JSON.stringify({ accessToken: "next" }), { status: 200 }));
    const { freshToken } = await client();
    expect(await freshToken()).toBe("next");
  });

  it("gives up on the token when the refresh fails, so the request goes out anonymous", async () => {
    window.localStorage.setItem(KEY, jwt(nowSeconds() + 5));
    mocks.fetchWithTimeout.mockResolvedValue(new Response("", { status: 401 }));
    const { freshToken } = await client();
    expect(await freshToken()).toBeNull();
  });

  it("passes through a token it cannot read an expiry from", async () => {
    window.localStorage.setItem(KEY, "mock-session-token");
    const { freshToken } = await client();
    expect(await freshToken()).toBe("mock-session-token");
    expect(mocks.fetchWithTimeout).not.toHaveBeenCalled();
  });

  it("is null for a visitor", async () => {
    const { freshToken } = await client();
    expect(await freshToken()).toBeNull();
  });
});
