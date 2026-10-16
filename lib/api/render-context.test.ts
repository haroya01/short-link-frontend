import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load() {
  vi.stubEnv("NEXT_PUBLIC_API_BASE", "https://api.kurl.test");
  vi.resetModules();
  return import("./render-context");
}

describe("the server-render mark on backend calls", () => {
  it("goes on every backend call a server render makes", async () => {
    vi.stubGlobal("window", undefined);
    const { renderContextHeaders, withRenderContext } = await load();
    expect(renderContextHeaders("https://api.kurl.test/api/v1/public/posts")).toEqual({ "X-Kurl-Render": "server" });
    const init = withRenderContext("https://api.kurl.test/api/v1/public/profiles/hana/posts/x", {
      headers: { "X-Post-Key": "k" },
    });
    const headers = new Headers(init.headers);
    expect(headers.get("X-Kurl-Render")).toBe("server");
    expect(headers.get("X-Post-Key")).toBe("k");
  });

  it("never rides to another host", async () => {
    vi.stubGlobal("window", undefined);
    const { renderContextHeaders } = await load();
    expect(renderContextHeaders("https://img.test/cover.png")).toEqual({});
  });

  it("never goes out from the browser, so the reader's own address is geo-checked", async () => {
    const { renderContextHeaders, withRenderContext } = await load();
    expect(renderContextHeaders("https://api.kurl.test/api/v1/public/posts")).toEqual({});
    const init = { cache: "no-store" as const };
    expect(withRenderContext("https://api.kurl.test/api/v1/public/posts", init)).toBe(init);
  });
});
