import { afterEach, describe, expect, it, vi } from "vitest";
import { kurlNoteId, kurlShortCode } from "./kurl-link";

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

describe("kurlNoteId", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("reads a note id from this server's note pages, including a dev origin", () => {
    expect(kurlNoteId("http://localhost:3107/ko/p/alice/notes/12")).toBe(12);
    expect(kurlNoteId("https://kurl.me/ap/notes/3/")).toBe(3);
    expect(kurlNoteId(" http://127.0.0.1/blog-preview/remote/9/notes/40 ")).toBe(40);
  });

  it("rejects other servers, other pages and non-urls", () => {
    expect(kurlNoteId("https://mastodon.social/@alice/notes/12")).toBeNull();
    expect(kurlNoteId("http://localhost:3107/ko/p/alice/posts/hello")).toBeNull();
    expect(kurlNoteId("http://localhost:3107/ko/p/alice/notes/abc")).toBeNull();
    expect(kurlNoteId("not a url")).toBeNull();
  });

  it("trusts only the blog host once one is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_BLOG_HOST", "blog.kurl.me");
    vi.resetModules();
    const { kurlNoteId: onBlogHost } = await import("./kurl-link");
    expect(onBlogHost("https://blog.kurl.me/@alice/notes/12")).toBe(12);
    expect(onBlogHost("https://www.blog.kurl.me/remote/4/notes/7")).toBe(7);
    expect(onBlogHost("http://localhost:3107/ko/p/alice/notes/12")).toBeNull();
  });
});
