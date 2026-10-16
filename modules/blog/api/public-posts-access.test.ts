import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchWithTimeout: vi.fn(), token: null as string | null }));

vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));
vi.mock("@/lib/api/fetch-timeout", () => ({ fetchWithTimeout: mocks.fetchWithTimeout }));
vi.mock("@/lib/api/client", () => ({
  freshToken: async () => mocks.token,
  readToken: () => mocks.token,
  mockFailure: () => null,
}));

import {
  findPublicPost,
  listFeedByTag,
  listPublicFeed,
  listPublicPosts,
  readPostDetail,
  unlockPost,
} from "./public-posts";

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}

const author = { id: 17, username: "hana", bio: null, avatarUrl: null };
const item = (over: Record<string, unknown>) => ({
  id: 1,
  slug: "s",
  title: "t",
  excerpt: "body-derived",
  ogImageUrl: "https://img.test/c.png",
  thumbnailUrl: "https://img.test/t.png",
  languageTag: "ko",
  tags: ["x"],
  likeCount: 0,
  publishedAt: "2026-05-01T00:00:00Z",
  lastEditedAt: null,
  pinned: false,
  author,
  viewCount: 0,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.token = null;
});

describe("the cache rule for protected and country-limited posts", () => {
  it("reads a post's detail uncached, link key or not, so no shared cache ever holds a body", async () => {
    mocks.fetchWithTimeout.mockResolvedValue(json({ author, post: item({}), blocks: [], series: null }));
    await findPublicPost("hana", "s", "k-1");
    expect(mocks.fetchWithTimeout).toHaveBeenCalledWith(expect.stringContaining("/api/v1/public/profiles/hana/posts/s"), {
      cache: "no-store",
      headers: { "X-Post-Key": "k-1" },
    });
    await findPublicPost("hana", "s");
    expect(mocks.fetchWithTimeout).toHaveBeenLastCalledWith(expect.any(String), { cache: "no-store" });
  });

  it("keeps the post page itself dynamic", () => {
    const page = fs.readFileSync(path.resolve(__dirname, "../../../app/[locale]/p/[username]/[slug]/page.tsx"), "utf8");
    expect(page).toMatch(/export const dynamic = "force-dynamic";/);
  });

  it("strips body-derived parts from an author's list before the ISR page caches it, and tags it for a refresh", async () => {
    mocks.fetchWithTimeout.mockResolvedValue(
      json({
        author,
        posts: [
          item({ id: 1, audience: "PUBLIC" }),
          item({ id: 2, audience: "FOLLOWERS", locked: { reason: "FOLLOWERS" } }),
          item({ id: 3, audience: "PASSWORD" }),
          item({ id: 4, audience: "PUBLIC", regionRestricted: true }),
        ],
      }),
    );
    const result = await listPublicPosts("Hana");
    expect(mocks.fetchWithTimeout).toHaveBeenCalledWith(expect.any(String), {
      next: { revalidate: 30, tags: ["author-posts:hana", "public-posts"] },
    });
    if (!result.ok) throw new Error("expected ok");
    const [open, followers, password, region] = result.data.posts;
    expect(open.excerpt).toBe("body-derived");
    for (const p of [followers, password, region]) {
      expect(p).toMatchObject({ excerpt: null, ogImageUrl: null, tags: [] });
    }
  });

  it("strips body-derived parts from discovery feeds too, whatever the server sent", async () => {
    mocks.fetchWithTimeout.mockImplementation(async () =>
      json({ items: [item({ regionRestricted: true }), item({ audience: "FOLLOWERS" })], page: 0, size: 20, hasNext: false }),
    );
    for (const result of [await listPublicFeed(), await listFeedByTag("x")]) {
      if (!result.ok) throw new Error("expected ok");
      for (const p of result.data.items) expect(p).toMatchObject({ excerpt: null, ogImageUrl: null, thumbnailUrl: null, tags: [] });
    }
    expect(mocks.fetchWithTimeout).toHaveBeenCalledWith(expect.any(String), { next: { revalidate: 30, tags: ["public-posts"] } });
  });
});

describe("reading a protected post from the browser", () => {
  it("sends the reader's token with the link key and the grant, uncached", async () => {
    mocks.token = "access";
    mocks.fetchWithTimeout.mockResolvedValue(json({ author, post: item({}), blocks: [], series: null }));
    await readPostDetail("hana", "s", { key: "k-1", grant: "g-1" });
    expect(mocks.fetchWithTimeout).toHaveBeenCalledWith(expect.stringContaining("/api/v1/public/profiles/hana/posts/s"), {
      cache: "no-store",
      headers: { "X-Post-Key": "k-1", "X-Post-Grant": "g-1", Authorization: "Bearer access" },
    });
  });
});

describe("unlocking a password post", () => {
  it("returns the grant on 200", async () => {
    mocks.fetchWithTimeout.mockResolvedValue(json({ grant: "g", expiresAt: "2026-10-17T00:00:00Z" }));
    await expect(unlockPost("hana", "s", "  spaced  ")).resolves.toEqual({ ok: true, grant: "g", expiresAt: "2026-10-17T00:00:00Z" });
    const [url, init] = mocks.fetchWithTimeout.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/public/profiles/hana/posts/s/unlock");
    expect(init).toMatchObject({ method: "POST", cache: "no-store" });
    expect(JSON.parse(String(init.body))).toEqual({ password: "  spaced  " });
  });

  it.each([
    [401, {}, { ok: false, reason: "invalid" }],
    [429, { "Retry-After": "120" }, { ok: false, reason: "attempts", retryAfter: 120 }],
    [403, {}, { ok: false, reason: "region" }],
    [500, {}, { ok: false, reason: "error" }],
  ])("maps %s to the gate's reason", async (status, headers, expected) => {
    mocks.fetchWithTimeout.mockResolvedValue(json({ code: "x" }, status, headers));
    await expect(unlockPost("hana", "s", "pw")).resolves.toEqual(expected);
  });

  it("treats a dropped connection as a retryable failure", async () => {
    mocks.fetchWithTimeout.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(unlockPost("hana", "s", "pw")).resolves.toEqual({ ok: false, reason: "error" });
  });
});
