import { describe, expect, it } from "vitest";
import { routeSubdomain } from "./route";

describe("routeSubdomain", () => {
  it("proxies the blog host to the frontend", () => {
    expect(routeSubdomain("blog.kurl.me", "/ko/tags/java", "")).toEqual({ kind: "proxy" });
  });

  it("passes reserved system hosts and non-kurl hosts through untouched", () => {
    for (const host of ["www.kurl.me", "app.kurl.me", "api.kurl.me", "origin.kurl.me", "kurl.kurl.me", "example.com"]) {
      expect(routeSubdomain(host, "/x", "")).toEqual({ kind: "pass" });
    }
  });

  it("moves an old card root to the apex card path, keeping the query", () => {
    expect(routeSubdomain("dohyun.kurl.me", "/", "?utm_source=instagram")).toEqual({
      kind: "redirect",
      location: "https://kurl.me/u/dohyun?utm_source=instagram",
    });
  });

  it("answers every other subdomain path at the edge instead of reaching the frontend", () => {
    for (const [host, path] of [
      ["jira.kurl.me", "/admin"],
      ["dohyun.kurl.me", "/series"],
      ["db.kurl.me", "/"],
      ["foo.bar.kurl.me", "/"],
      ["log.kurl.me", "/.env"],
    ]) {
      expect(routeSubdomain(host, path, "")).toEqual({ kind: "notFound" });
    }
  });
});
