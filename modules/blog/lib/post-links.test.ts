import { describe, expect, it } from "vitest";
import { extractExternalLinks, isShortenableLink, rewriteMarkdownLinks } from "./post-links";

describe("isShortenableLink", () => {
  it("accepts external http(s) links", () => {
    expect(isShortenableLink("https://example.com/post")).toBe(true);
    expect(isShortenableLink("http://example.com")).toBe(true);
  });
  it("rejects non-http, relative, and already-kurl links", () => {
    expect(isShortenableLink("/p/dohyun")).toBe(false);
    expect(isShortenableLink("mailto:a@b.com")).toBe(false);
    expect(isShortenableLink("#section")).toBe(false);
    expect(isShortenableLink("https://kurl.me/abc123")).toBe(false); // already shortened → idempotent
  });
});

describe("extractExternalLinks", () => {
  it("finds inline links and autolinks, deduped in order", () => {
    const md = "See [docs](https://example.com/a) and <https://example.org/b> and [again](https://example.com/a).";
    expect(extractExternalLinks(md)).toEqual(["https://example.com/a", "https://example.org/b"]);
  });

  it("skips image embeds, relative links, and already-kurl links", () => {
    const md = [
      "![cover](https://assets.kurl.me/x.png)",
      "[internal](/p/dohyun)",
      "[short](https://kurl.me/abc123)",
      "[real](https://example.com/keep)",
    ].join("\n\n");
    expect(extractExternalLinks(md)).toEqual(["https://example.com/keep"]);
  });

  it("ignores links inside fenced and inline code", () => {
    const md = [
      "```\n[fenced](https://example.com/code)\n```",
      "inline `[code](https://example.com/inline)` here",
      "[live](https://example.com/live)",
    ].join("\n\n");
    expect(extractExternalLinks(md)).toEqual(["https://example.com/live"]);
  });
});

describe("rewriteMarkdownLinks", () => {
  it("rewrites only the mapped link targets, leaving text/images/code intact", () => {
    const md = [
      "Read [docs](https://example.com/a) now.",
      "![pic](https://example.com/a)", // same URL as an image src → must stay
      "```\n[x](https://example.com/a)\n```", // in code → must stay
    ].join("\n\n");
    const out = rewriteMarkdownLinks(md, { "https://example.com/a": "https://kurl.me/Ab12" });
    expect(out).toContain("[docs](https://kurl.me/Ab12)");
    expect(out).toContain("![pic](https://example.com/a)");
    expect(out).toContain("[x](https://example.com/a)");
  });

  it("handles multiple links and preserves surrounding markdown", () => {
    const md = "A [one](https://a.com) B [two](https://b.com) C";
    const out = rewriteMarkdownLinks(md, {
      "https://a.com": "https://kurl.me/AA",
      "https://b.com": "https://kurl.me/BB",
    });
    expect(out).toBe("A [one](https://kurl.me/AA) B [two](https://kurl.me/BB) C");
  });

  it("leaves URLs absent from the map untouched", () => {
    const md = "[keep](https://keep.com) [move](https://move.com)";
    const out = rewriteMarkdownLinks(md, { "https://move.com": "https://kurl.me/MV" });
    expect(out).toBe("[keep](https://keep.com) [move](https://kurl.me/MV)");
  });
});
