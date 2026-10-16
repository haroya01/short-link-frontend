import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/api/fetch-timeout", () => ({ fetchWithTimeout: vi.fn(), isTimeoutError: () => false }));
vi.mock("@/lib/analytics/behavior", () => ({ behaviorSessionId: () => null }));

let root: Root | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.fetch.mockResolvedValue(new Response(null, { status: 204 }));
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.localStorage.clear();
  window.sessionStorage.clear();
  Object.defineProperty(document, "referrer", {
    configurable: true,
    value: "https://blog.kurl.me/@hana/link-only-draft?k=secret-key&utm_source=x",
  });
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

async function mount(postId?: number) {
  vi.resetModules();
  const access = await import("@/modules/blog/lib/post-access");
  access.rememberPostKey(31, "k31");
  const { ViewBeacon } = await import("./view-beacon");
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(createElement(ViewBeacon, { username: "hana", slug: "next-post", postId })));
  await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
  const [url, init] = mocks.fetch.mock.calls[0] as [string, RequestInit];
  return { ref: new URL(url, "http://x").searchParams.get("ref"), headers: new Headers(init.headers) };
}

describe("the view beacon of a post read after a link-only one", () => {
  it("reports where the reader came from without the link key", async () => {
    const { ref } = await mount();
    expect(ref).toBe("https://blog.kurl.me/@hana/link-only-draft?utm_source=x");
    expect(ref).not.toContain("secret-key");
  });

  it("carries the post's own key, so a keyed view is counted", async () => {
    const { headers } = await mount(31);
    expect(headers.get("X-Post-Key")).toBe("k31");
  });

  it("never carries one post's key on another post's beacon", async () => {
    const { headers } = await mount(32);
    expect(headers.get("X-Post-Key")).toBeNull();
  });
});
