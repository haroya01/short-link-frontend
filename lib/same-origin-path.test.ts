import { describe, expect, it } from "vitest";
import { sameOriginPath } from "./same-origin-path";

describe("sameOriginPath", () => {
  it("keeps an in-app path with its query and hash", () => {
    expect(sameOriginPath("/write/12?draft=1#top")).toBe("/write/12?draft=1#top");
    expect(sameOriginPath("/")).toBe("/");
    expect(sameOriginPath(`${window.location.origin}/tags/rust`)).toBe("/tags/rust");
  });

  it("rejects anything that resolves to another origin", () => {
    for (const raw of ["//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "https://evil.example", "javascript:alert(1)", " //evil.example"]) {
      expect(sameOriginPath(raw)).toBeNull();
    }
  });

  it("rejects a path that normalizes into a protocol-relative one", () => {
    expect(sameOriginPath("/a/..//evil.example")).toBeNull();
    expect(sameOriginPath("/./%2e%2e//evil.example")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(sameOriginPath(null)).toBeNull();
    expect(sameOriginPath("")).toBeNull();
  });
});
