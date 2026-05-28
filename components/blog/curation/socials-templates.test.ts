import { describe, expect, it } from "vitest";
import type { ShareChannel } from "@/types";
import { socialUrlPrefix } from "@/components/blog/curation/socials-templates";

describe("socialUrlPrefix", () => {
  it("returns the canonical handle-prefix for each channel", () => {
    expect(socialUrlPrefix("x")).toBe("https://x.com/");
    expect(socialUrlPrefix("line")).toBe("https://line.me/ti/p/~");
    expect(socialUrlPrefix("threads")).toBe("https://threads.net/@");
    expect(socialUrlPrefix("facebook")).toBe("https://facebook.com/");
    expect(socialUrlPrefix("kakao")).toBe("https://pf.kakao.com/_");
    expect(socialUrlPrefix("instagram")).toBe("https://instagram.com/");
    expect(socialUrlPrefix("linkedin")).toBe("https://linkedin.com/in/");
  });

  it("returns every prefix as an absolute https URL", () => {
    const channels: ShareChannel[] = [
      "x",
      "line",
      "threads",
      "facebook",
      "kakao",
      "instagram",
      "linkedin",
    ];
    for (const c of channels) {
      const prefix = socialUrlPrefix(c);
      expect(prefix).toMatch(/^https:\/\//);
    }
  });

  it("LINE prefix includes the ~ token that maps to 'friend add by ID'", () => {
    // Comment in the source explains this — without the ~ the URL parses as a sharelink token,
    // not a friend-add target. Lock in the contract so a refactor doesn't drop it.
    expect(socialUrlPrefix("line")).toContain("~");
  });

  it("Threads prefix includes the @ that precedes the handle", () => {
    expect(socialUrlPrefix("threads").endsWith("@")).toBe(true);
  });
});
