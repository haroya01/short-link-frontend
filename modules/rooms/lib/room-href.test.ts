import { afterEach, describe, expect, it, vi } from "vitest";

async function inviteUrl(blogHost: string, code: string): Promise<string> {
  vi.stubEnv("NEXT_PUBLIC_BLOG_HOST", blogHost);
  vi.resetModules();
  const { roomInviteUrl } = await import("./room-href");
  return roomInviteUrl(code);
}

describe("the invite address people share", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is the invite page itself on the blog host, with no short link or language prefix in front", async () => {
    expect(await inviteUrl("blog.kurl.me", "r100x")).toBe("https://blog.kurl.me/rooms/join/r100x");
  });

  it("is a full address on the current origin where the blog has no host of its own", async () => {
    expect(await inviteUrl("", "r100x")).toBe(`${window.location.origin}/blog-preview/rooms/join/r100x`);
  });

  it("keeps an unusual code inside one path segment", async () => {
    expect(await inviteUrl("blog.kurl.me", "a/b?c")).toBe("https://blog.kurl.me/rooms/join/a%2Fb%3Fc");
  });
});
