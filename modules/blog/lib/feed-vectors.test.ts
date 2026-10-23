import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import seenVectors from "./vectors/seen-rules.json";

vi.mock("react", async (actual) => ({ ...(await actual<typeof import("react")>()), cache: <T>(fn: T) => fn }));

describe("which requests carry seen=hide and the device (kurl.seen-rules requests)", () => {
  type RequestCase = {
    id: string;
    surface: string;
    what: string;
    seenHide: boolean;
    deviceHeader: "required" | "notNeeded";
  };
  const DEVICE = "0f8fad5b-d9cb-469f-a165-70867728950e";
  let calls: { url: string; headers: Headers }[] = [];

  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("kurl:device-id", DEVICE);
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
        calls.push({ url: String(input), headers: new Headers(init.headers) });
        return new Response(JSON.stringify({ items: [], next: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  async function ask(c: RequestCase) {
    vi.resetModules();
    const { listHome } = await import("@/modules/blog/api/home-feed");
    const { listRemoteNotes } = await import("@/modules/notes/api/remote-trending");
    const latest = c.surface === "home-latest";
    if (c.what.startsWith("맞춤")) {
      return listRemoteNotes("for-you", c.what.includes("next") ? "f1.20" : null, undefined, latest);
    }
    if (c.surface === "explore-remote") return listRemoteNotes("for-you");
    const tab = c.surface === "home-following" ? "following" : c.surface === "home-trending" ? "trending" : "latest";
    return listHome(tab, c.what === "next page" ? "h1.20.0" : null, undefined, latest);
  }

  const cases = (seenVectors.tables.requests.cases as RequestCase[]).map((c) => [c.id, c] as const);

  it.each(cases)("%s", async (_, c) => {
    await ask(c);
    const call = calls.find((sent) => !sent.url.endsWith("/auth/refresh"))!;
    expect(new URL(call.url, "http://x").searchParams.get("seen") === "hide").toBe(c.seenHide);
    if (c.deviceHeader === "required") expect(call.headers.get("X-Kurl-Device")).toBe(DEVICE);
  });
});
