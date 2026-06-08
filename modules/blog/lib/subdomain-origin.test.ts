import { afterEach, describe, expect, it } from "vitest";
import { authorBaseUrl } from "./subdomain-origin";

/** A header reader stub backed by a plain map. */
function headers(map: Record<string, string>) {
  return { get: (name: string) => map[name] ?? null };
}

describe("authorBaseUrl", () => {
  const saved = process.env.NEXT_PUBLIC_BLOG_HOST;
  afterEach(() => {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_BLOG_HOST;
    else process.env.NEXT_PUBLIC_BLOG_HOST = saved;
  });

  it("uses the configured blog host, velog-style /@user", () => {
    process.env.NEXT_PUBLIC_BLOG_HOST = "blog.kurl.me";
    const req = headers({ host: "blog.kurl.me" });
    expect(authorBaseUrl(req, "dohyeon")).toBe("https://blog.kurl.me/@dohyeon");
  });

  it("falls back to the request host when no blog-host env (port stripped)", () => {
    delete process.env.NEXT_PUBLIC_BLOG_HOST;
    const req = headers({ host: "localhost:3001" });
    expect(authorBaseUrl(req, "dohyeon")).toBe("https://localhost/@dohyeon");
  });

  it("prefers x-original-host over host when falling back", () => {
    delete process.env.NEXT_PUBLIC_BLOG_HOST;
    const req = headers({ "x-original-host": "blog.kurl.me", host: "kurl.me" });
    expect(authorBaseUrl(req, "dohyeon")).toBe("https://blog.kurl.me/@dohyeon");
  });

  it("falls back to blog.kurl.me with no host header", () => {
    delete process.env.NEXT_PUBLIC_BLOG_HOST;
    const req = headers({});
    expect(authorBaseUrl(req, "dohyeon")).toBe("https://blog.kurl.me/@dohyeon");
  });
});
