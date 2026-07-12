import { describe, expect, it } from "vitest";
import { publicOrigin, publicSelfUrl } from "./host";

/** A minimal Request stub: just the url + a header map (all publicOrigin/publicSelfUrl read). */
function req(url: string, headers: Record<string, string> = {}): Request {
  return {
    url,
    headers: { get: (name: string) => headers[name] ?? null },
  } as unknown as Request;
}

describe("publicOrigin", () => {
  it("prefers x-original-host so the CF proxy's internal Vercel host never leaks", () => {
    const r = req("https://short-link-frontend-blond.vercel.app/ko/blog/feed", {
      "x-original-host": "blog.kurl.me",
    });
    expect(publicOrigin(r)).toBe("https://blog.kurl.me");
  });

  it("strips a port from x-original-host", () => {
    const r = req("http://localhost:3001/ko/blog/feed", { "x-original-host": "blog.kurl.me:8443" });
    expect(publicOrigin(r)).toBe("https://blog.kurl.me");
  });

  it("falls back to the request origin when no proxy header (dev/preview)", () => {
    const r = req("http://localhost:3001/ko/blog/feed");
    expect(publicOrigin(r)).toBe("http://localhost:3001");
  });
});

describe("publicSelfUrl", () => {
  it("rebuilds the self URL on the public origin, keeping path + query", () => {
    const r = req("https://short-link-frontend-blond.vercel.app/ko/blog/feed?x=1", {
      "x-original-host": "blog.kurl.me",
    });
    expect(publicSelfUrl(r)).toBe("https://blog.kurl.me/ko/blog/feed?x=1");
  });
});
