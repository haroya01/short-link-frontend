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
  // A leading locale can precede the handle (typed by hand / an old link) — strip it before the
  // handle check so `/ko/@user` isn't mistaken for a two-segment (non-tab) subdomain path.
  it("tolerates an optional leading locale", () => {
    expect(isTabRoute("/ko/@honggildong")).toBe(true);
    expect(isTabRoute("/en/@honggildong/")).toBe(true);
    for (const tab of TABS) expect(isTabRoute(`/ko/@honggildong/${tab}`)).toBe(true);
    expect(isTabRoute("/ko/@honggildong/my-post")).toBe(false);
    expect(isTabRoute("/ko/@honggildong/series/deep-dive")).toBe(false);
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
  // The locale-strip (for /ko/@user) must not fire here: a bare two-letter first segment is a post
  // slug on the subdomain, not a locale to peel — it stays a non-tab.
  it("a two-letter post slug is not a tab", () => {
    expect(isTabRoute("/ab")).toBe(false);
    expect(isTabRoute("/ko")).toBe(false);
  });
});
