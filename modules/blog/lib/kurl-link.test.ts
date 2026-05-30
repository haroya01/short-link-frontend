import { describe, expect, it } from "vitest";
import { kurlShortCode } from "./kurl-link";

describe("kurlShortCode", () => {
  it("extracts the code from a kurl short link", () => {
    expect(kurlShortCode("https://kurl.me/abc123")).toBe("abc123");
    expect(kurlShortCode("https://www.kurl.me/Xy9")).toBe("Xy9");
    expect(kurlShortCode("https://kurl.me/abc123/")).toBe("abc123");
  });

  it("rejects non-kurl hosts and non-code paths", () => {
    expect(kurlShortCode("https://example.com/abc123")).toBeNull();
    expect(kurlShortCode("https://kurl.me/")).toBeNull();
    expect(kurlShortCode("https://kurl.me/blog/write/19")).toBeNull();
    expect(kurlShortCode("https://kurl.me/way-too-long-to-be-a-code")).toBeNull();
    expect(kurlShortCode("not a url")).toBeNull();
  });
});
