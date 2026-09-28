import { describe, expect, it } from "vitest";
import { extractUrl } from "./extract-url";

describe("extractUrl", () => {
  it("returns a bare URL as is", () => {
    expect(extractUrl("  https://example.com/a?b=1  ")).toBe("https://example.com/a?b=1");
  });

  it("finds the link inside shared text and drops sentence punctuation", () => {
    expect(extractUrl("이거 봐 https://shop.example.com/sale!")).toBe("https://shop.example.com/sale");
    expect(extractUrl("Read this: http://blog.example.com/post.")).toBe("http://blog.example.com/post");
  });

  it("ignores text without an http(s) link", () => {
    expect(extractUrl("")).toBeNull();
    expect(extractUrl("그냥 메모")).toBeNull();
    expect(extractUrl("ftp://files.example.com")).toBeNull();
  });
});
