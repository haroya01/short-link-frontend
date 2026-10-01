import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import {
  isBlogSurface,
  themeCookieName,
  themeCookieNameScript,
  writeThemeCookie,
} from "./theme-cookie";

vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_KURL_HOST", "kurl.me");
  vi.stubEnv("NEXT_PUBLIC_BLOG_HOST", "blog.kurl.me");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(() => {
  vi.unstubAllEnvs();
});

/** Visitor-facing URLs as the browser sees them (the middleware rewrites happen server-side). */
const SURFACES = [
  { host: "kurl.me", path: "/ko", cookie: "kurl_theme" },
  { host: "kurl.me", path: "/ko/dashboard", cookie: "kurl_theme" },
  { host: "kurl.me", path: "/ko/u/alice", cookie: "kurl_theme" },
  { host: "kurl.me", path: "/ko/p/alice", cookie: "theme" },
  { host: "kurl.me", path: "/en/blog/write", cookie: "theme" },
  { host: "blog.kurl.me", path: "/", cookie: "theme" },
  { host: "blog.kurl.me", path: "/ko/write", cookie: "theme" },
  { host: "blog.kurl.me", path: "/@alice/first-post", cookie: "theme" },
  { host: "alice.kurl.me", path: "/", cookie: "kurl_theme" },
  { host: "alice.kurl.me", path: "/nope", cookie: "kurl_theme" },
  { host: "localhost", path: "/ko/dashboard", cookie: "kurl_theme" },
  { host: "localhost", path: "/ko/u/alice", cookie: "kurl_theme" },
  { host: "localhost", path: "/ko/blog", cookie: "theme" },
  { host: "short-link-frontend-git-x.vercel.app", path: "/ja/p/alice", cookie: "theme" },
] as const;

function at(hostname: string, pathname: string): string[] {
  const written: string[] = [];
  vi.stubGlobal("location", { hostname, pathname });
  vi.stubGlobal("document", {
    set cookie(value: string) {
      written.push(value);
    },
  });
  return written;
}

function scriptCookieName(hostname: string, pathname: string): string {
  return new Function("location", `${themeCookieNameScript}return n;`)({ hostname, pathname });
}

describe("theme surface", () => {
  it.each(SURFACES)("$host $path reads $cookie", ({ host, path, cookie }) => {
    at(host, path);
    expect(themeCookieName()).toBe(cookie);
    expect(isBlogSurface()).toBe(cookie === "theme");
  });

  it.each(SURFACES)("the inlined pre-paint script agrees on $host $path", ({ host, path, cookie }) => {
    expect(scriptCookieName(host, path)).toBe(cookie);
  });

  it("falls back to kurl during SSR, where there is no location", () => {
    vi.stubGlobal("location", undefined);
    expect(isBlogSurface()).toBe(false);
    expect(themeCookieName()).toBe("kurl_theme");
  });
});

describe("writeThemeCookie", () => {
  it("writes a kurl choice on the apex to .kurl.me, where the card subdomain reads it", () => {
    const written = at("kurl.me", "/ko/settings");
    writeThemeCookie("dark");
    expect(written).toEqual([
      "kurl_theme=dark; path=/; max-age=31536000; samesite=lax; domain=.kurl.me",
    ]);

    at("alice.kurl.me", "/");
    expect(themeCookieName()).toBe("kurl_theme");
  });

  it("keeps the cookie host-only off-platform", () => {
    const written = at("localhost", "/ko/blog/settings");
    writeThemeCookie("light");
    expect(written).toEqual(["theme=light; path=/; max-age=31536000; samesite=lax"]);
  });
});
