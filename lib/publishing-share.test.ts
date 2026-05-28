import { describe, expect, it } from "vitest";

import { buildAuthorShareUrl, buildSharePlatformIntent } from "./publishing-share";

describe("buildAuthorShareUrl", () => {
  it("appends author-share UTM params", () => {
    const out = buildAuthorShareUrl("https://john.kurl.me/post-a", "post-a", "twitter");
    const url = new URL(out);
    expect(url.searchParams.get("utm_source")).toBe("author-share");
    expect(url.searchParams.get("utm_medium")).toBe("kurl_twitter");
    expect(url.searchParams.get("utm_campaign")).toBe("post-a");
  });

  it("preserves existing query params", () => {
    const out = buildAuthorShareUrl("https://john.kurl.me/post-a?ref=existing", "post-a", "copy");
    const url = new URL(out);
    expect(url.searchParams.get("ref")).toBe("existing");
    expect(url.searchParams.get("utm_source")).toBe("author-share");
    expect(url.searchParams.get("utm_medium")).toBe("kurl_copy");
  });

  it("differentiates platforms via utm_medium", () => {
    const out1 = buildAuthorShareUrl("https://x.kurl.me/a", "a", "twitter");
    const out2 = buildAuthorShareUrl("https://x.kurl.me/a", "a", "facebook");
    expect(new URL(out1).searchParams.get("utm_medium")).toBe("kurl_twitter");
    expect(new URL(out2).searchParams.get("utm_medium")).toBe("kurl_facebook");
  });
});

describe("buildSharePlatformIntent", () => {
  it("returns Twitter intent for twitter platform", () => {
    const out = buildSharePlatformIntent(
      "https://john.kurl.me/post-a?utm_source=author-share",
      "Hello World",
      "twitter",
    );
    expect(out).toContain("twitter.com/intent/tweet");
    expect(out).toContain(encodeURIComponent("Hello World"));
  });

  it("returns Facebook sharer URL", () => {
    const out = buildSharePlatformIntent("https://x.kurl.me/a", "T", "facebook");
    expect(out).toContain("facebook.com/sharer");
  });

  it("returns null for copy / kakaotalk (client-side handled)", () => {
    expect(buildSharePlatformIntent("https://x", "T", "copy")).toBeNull();
    expect(buildSharePlatformIntent("https://x", "T", "kakaotalk")).toBeNull();
  });
});
