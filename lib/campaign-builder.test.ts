import { describe, expect, it } from "vitest";
import {
  appendUtmParams,
  extractUrls,
  replaceUrls,
  slugifyCampaign,
} from "./campaign-builder";

describe("slugifyCampaign", () => {
  it("lowercases and dashes ascii words", () => {
    expect(slugifyCampaign("Spring Sale 2026")).toBe("spring-sale-2026");
  });

  it("preserves non-ascii letters", () => {
    expect(slugifyCampaign("신상품 출시")).toBe("신상품-출시");
  });

  it("strips query-string punctuation that would break utm_campaign", () => {
    // Underscores get dash-normalized too so the slug reads consistently regardless of input.
    expect(slugifyCampaign("launch?utm_source=foo")).toBe("launchutm-sourcefoo");
  });

  it("collapses runs of separators and trims edges", () => {
    expect(slugifyCampaign("  hello___world / news  ")).toBe("hello-world-news");
  });

  it("caps at 40 chars so utm_campaign stays readable", () => {
    expect(slugifyCampaign("x".repeat(80)).length).toBe(40);
  });

  it("empty input yields empty slug", () => {
    expect(slugifyCampaign("")).toBe("");
    expect(slugifyCampaign("   ")).toBe("");
  });
});

describe("extractUrls", () => {
  it("finds http and https links", () => {
    const out = extractUrls("see http://a.com and https://b.com/x for more");
    expect(out).toEqual(["http://a.com", "https://b.com/x"]);
  });

  it("dedupes within the body", () => {
    const out = extractUrls("https://a.com one https://a.com two");
    expect(out).toEqual(["https://a.com"]);
  });

  it("strips trailing punctuation", () => {
    expect(extractUrls("read https://a.com.")).toEqual(["https://a.com"]);
    expect(extractUrls("(see https://a.com)")).toEqual(["https://a.com"]);
    expect(extractUrls("hi https://a.com!")).toEqual(["https://a.com"]);
  });

  it("keeps internal query string and fragments", () => {
    expect(extractUrls("https://a.com/x?y=1&z=2#hash")).toEqual([
      "https://a.com/x?y=1&z=2#hash",
    ]);
  });

  it("returns empty for body without urls", () => {
    expect(extractUrls("just text")).toEqual([]);
  });
});

describe("appendUtmParams", () => {
  it("attaches all three params on a clean url", () => {
    const out = appendUtmParams("https://a.com/x", {
      source: "email",
      campaign: "spring-sale",
    });
    const url = new URL(out);
    expect(url.searchParams.get("utm_source")).toBe("email");
    expect(url.searchParams.get("utm_campaign")).toBe("spring-sale");
    expect(url.searchParams.get("utm_medium")).toBe("email");
  });

  it("overwrites existing utm but preserves unrelated params", () => {
    const out = appendUtmParams("https://a.com/?ref=ig&utm_source=old", {
      source: "email",
      campaign: "spring-sale",
    });
    const url = new URL(out);
    expect(url.searchParams.get("ref")).toBe("ig");
    expect(url.searchParams.get("utm_source")).toBe("email");
  });

  it("preserves a pre-existing utm_content", () => {
    const out = appendUtmParams("https://a.com/?utm_content=hero", {
      source: "email",
      campaign: "spring-sale",
    });
    expect(new URL(out).searchParams.get("utm_content")).toBe("hero");
  });

  it("returns the original string on malformed url", () => {
    expect(appendUtmParams("not a url", { source: "email", campaign: "x" })).toBe(
      "not a url",
    );
  });

  it("custom medium overrides default", () => {
    const out = appendUtmParams("https://a.com", {
      source: "newsletter",
      campaign: "weekly",
      medium: "broadcast",
    });
    expect(new URL(out).searchParams.get("utm_medium")).toBe("broadcast");
  });
});

describe("replaceUrls", () => {
  it("swaps urls and keeps surrounding text intact", () => {
    const out = replaceUrls("hi https://a.com bye", () => "https://kurl.me/abc");
    expect(out).toBe("hi https://kurl.me/abc bye");
  });

  it("preserves trailing punctuation outside the url", () => {
    const out = replaceUrls("read https://a.com.", () => "https://kurl.me/abc");
    expect(out).toBe("read https://kurl.me/abc.");
  });

  it("handles multiple distinct urls independently", () => {
    let i = 0;
    const out = replaceUrls("https://a.com and https://b.com", () => `https://kurl.me/${i++}`);
    expect(out).toBe("https://kurl.me/0 and https://kurl.me/1");
  });
});
