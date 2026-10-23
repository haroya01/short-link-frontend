import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pullNotice } from "./home-pull";
import seenVectors from "./vectors/seen-rules.json";

vi.mock("react", async (actual) => ({ ...(await actual<typeof import("react")>()), cache: <T>(fn: T) => fn }));

describe("what a 홈 추천 pull says (kurl.seen-rules pull)", () => {
  type PullCase = {
    id: string;
    before: string[];
    result: "ok" | "failed";
    after?: string[];
    notice: string;
    rowsAfter: string[];
  };
  const cases = (seenVectors.tables.pull.cases as PullCase[]).map((c) => [c.id, c] as const);

  it.each(cases)("%s", (_, c) => {
    const rows = c.result === "ok" ? c.after! : c.before;
    expect(pullNotice(new Set(c.before), rows, { own: c.result === "failed", remote: false })).toBe(c.notice);
    expect(rows).toEqual(c.rowsAfter);
  });
});

describe("which requests carry seen=hide and the device (kurl.seen-rules requests)", () => {
  type RequestCase = {
    id: string;
    surface: "home-for-you" | "home-following" | "explore-remote";
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
    if (c.surface === "explore-remote") return listRemoteNotes("for-you");
    if (c.surface === "home-following") return listHome("following");
    return listHome("for-you", c.what === "next page" ? "h1.20" : null, undefined, true);
  }

  const cases = (seenVectors.tables.requests.cases as RequestCase[]).map((c) => [c.id, c] as const);

  it.each(cases)("%s", async (_, c) => {
    await ask(c);
    const call = calls.find((sent) => !sent.url.endsWith("/auth/refresh"))!;
    expect(new URL(call.url, "http://x").searchParams.get("seen") === "hide").toBe(c.seenHide);
    if (c.deviceHeader === "required") expect(call.headers.get("X-Kurl-Device")).toBe(DEVICE);
  });
});
