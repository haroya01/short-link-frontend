import { afterEach, describe, expect, it, vi } from "vitest";
import { publicOrigin, publicSelfUrl, trustedOriginalHost } from "./host";

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

  it("ignores an x-original-host that is not a kurl host", () => {
    for (const host of ["evil.example", "kurl.me.evil.example", "evilkurl.me", "evil.example/.kurl.me", "evil.example#.kurl.me", "evil.example?.kurl.me"]) {
      const r = req("https://short-link-frontend-blond.vercel.app/ko/blog/feed", { "x-original-host": host });
      expect(publicOrigin(r)).toBe("https://short-link-frontend-blond.vercel.app");
    }
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

describe("trustedOriginalHost", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts kurl.me and its subdomains", () => {
    expect(trustedOriginalHost("kurl.me")).toBe("kurl.me");
    expect(trustedOriginalHost("Blog.Kurl.me:443")).toBe("blog.kurl.me");
    expect(trustedOriginalHost("dohyun.kurl.me")).toBe("dohyun.kurl.me");
  });

  it("accepts the configured dev hosts", () => {
    vi.stubEnv("NEXT_PUBLIC_BLOG_HOST", "blog.kurl.test:3001");
    expect(trustedOriginalHost("blog.kurl.test")).toBe("blog.kurl.test");
    expect(trustedOriginalHost("evil.example")).toBeNull();
  });

  it("rejects missing, foreign and malformed hosts", () => {
    for (const host of [null, "", "evil.example", "kurl.me.evil.example", "evilkurl.me", "evil.example/.kurl.me", "evil.example@kurl.me"]) {
      expect(trustedOriginalHost(host)).toBeNull();
    }
  });
});
