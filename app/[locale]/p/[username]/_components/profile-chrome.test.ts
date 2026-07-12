import { describe, expect, it } from "vitest";
import { isTabRoute } from "./profile-chrome";

// isTabRoute decides whether ProfileChrome renders the identity header + tab bar.
// It must agree across the three live URL topologies (apex /{locale}/p/{user},
// blog-host /@{handle}, author-subdomain root) — regressions here silently drop
// the whole author chrome (avatar / bio / follow / tabs / page frame).
const TABS = ["series", "collections", "about", "liked", "bookmarks"];

describe("isTabRoute — apex /{locale}/p/{user}", () => {
  it("author home", () => {
    expect(isTabRoute("/ko/p/hong")).toBe(true);
    expect(isTabRoute("/ko/p/hong/")).toBe(true);
  });
  it("every tab segment", () => {
    for (const tab of TABS) expect(isTabRoute(`/ko/p/hong/${tab}`)).toBe(true);
  });
  it("post slug and deeper routes are not tabs", () => {
    expect(isTabRoute("/ko/p/hong/my-post")).toBe(false);
    expect(isTabRoute("/ko/p/hong/series/deep-dive")).toBe(false);
  });
});

describe("isTabRoute — blog host /@{handle}", () => {
  it("author home (canonical URL from byline links)", () => {
    expect(isTabRoute("/@honggildong")).toBe(true);
    expect(isTabRoute("/@honggildong/")).toBe(true);
  });
  it("every tab segment", () => {
    for (const tab of TABS) expect(isTabRoute(`/@honggildong/${tab}`)).toBe(true);
  });
  it("post slug and deeper routes are not tabs", () => {
    expect(isTabRoute("/@honggildong/my-post")).toBe(false);
    expect(isTabRoute("/@honggildong/series/deep-dive")).toBe(false);
  });
});

describe("isTabRoute — author subdomain (path has no /p/ and no @)", () => {
  it("subdomain root", () => {
    expect(isTabRoute("/")).toBe(true);
  });
  it("every tab segment", () => {
    for (const tab of TABS) expect(isTabRoute(`/${tab}`)).toBe(true);
  });
  it("post slug and deeper routes are not tabs", () => {
    expect(isTabRoute("/my-post")).toBe(false);
    expect(isTabRoute("/series/deep-dive")).toBe(false);
  });
});
