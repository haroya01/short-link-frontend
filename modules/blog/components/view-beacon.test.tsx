import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchWithTimeout: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/api/fetch-timeout", () => ({ fetchWithTimeout: mocks.fetchWithTimeout, isTimeoutError: () => false }));
vi.mock("@/lib/analytics/behavior", () => ({ behaviorSessionId: () => null }));

const KEY = "short-link:access-token";

function jwt(expSeconds: number): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "HS256" })}.${encode({ sub: "1", exp: expSeconds })}.signature`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

let root: Root | null = null;

async function mountBeacon() {
  vi.resetModules();
  const { ViewBeacon } = await import("./view-beacon");
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(createElement(ViewBeacon, { username: "dohyun", slug: "naming-things" })));
  await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
  const [url, init] = mocks.fetch.mock.calls[0] as [string, RequestInit];
  return { url, init, authorization: new Headers(init.headers).get("Authorization") };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.fetch.mockResolvedValue(new Response(null, { status: 204 }));
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.localStorage.clear();
  document.cookie = "kurl_has_session=; path=/; max-age=0";
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("ViewBeacon", () => {
  it("tells the server who is reading when the reader is signed in, so the author's own view is left out", async () => {
    const token = jwt(nowSeconds() + 600);
    window.localStorage.setItem(KEY, token);
    const { url, init, authorization } = await mountBeacon();
    expect(url).toContain("/api/v1/public/profiles/dohyun/posts/naming-things/view");
    expect(init).toMatchObject({ method: "POST", keepalive: true });
    expect(authorization).toBe(`Bearer ${token}`);
    expect(mocks.fetchWithTimeout).not.toHaveBeenCalled();
  });

  it("sends no Authorization header for a visitor", async () => {
    const { init, authorization } = await mountBeacon();
    expect(init).toMatchObject({ method: "POST", keepalive: true });
    expect(authorization).toBeNull();
    expect(mocks.fetchWithTimeout).not.toHaveBeenCalled();
  });

  it("renews a token about to expire before sending it, instead of sending one the server reads as anonymous", async () => {
    window.localStorage.setItem(KEY, jwt(nowSeconds() + 5));
    const renewed = jwt(nowSeconds() + 900);
    mocks.fetchWithTimeout.mockResolvedValue(new Response(JSON.stringify({ accessToken: renewed }), { status: 200 }));
    const { authorization } = await mountBeacon();
    expect(authorization).toBe(`Bearer ${renewed}`);
  });

  it("recovers the session on a subdomain that has no token yet before sending the view", async () => {
    document.cookie = "kurl_has_session=1; path=/";
    const recovered = jwt(nowSeconds() + 900);
    mocks.fetchWithTimeout.mockResolvedValue(new Response(JSON.stringify({ accessToken: recovered }), { status: 200 }));
    const { authorization } = await mountBeacon();
    expect(authorization).toBe(`Bearer ${recovered}`);
    expect(mocks.fetchWithTimeout).toHaveBeenCalledTimes(1);
  });

  it("still counts the view, anonymously, when the expired token cannot be renewed", async () => {
    window.localStorage.setItem(KEY, jwt(nowSeconds() - 3600));
    mocks.fetchWithTimeout.mockResolvedValue(new Response("", { status: 401 }));
    const { authorization } = await mountBeacon();
    expect(authorization).toBeNull();
  });
});
