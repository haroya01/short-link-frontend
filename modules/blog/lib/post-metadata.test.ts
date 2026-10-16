import { describe, expect, it } from "vitest";
import type { PublicAuthor, PublicPostListItem } from "@/modules/blog/api/public-posts";
import { postMetadata } from "./post-metadata";

const author: PublicAuthor = { id: 17, username: "hana", bio: null, avatarUrl: null };
const post: PublicPostListItem = {
  id: 902,
  slug: "letters",
  title: "팔로워에게만 쓰는 근황",
  excerpt: "가까운 사람들에게만 털어놓는 이야기.",
  ogImageUrl: "https://img.test/cover.png",
  languageTag: "ko",
  tags: ["일상"],
  likeCount: 5,
  publishedAt: "2026-05-14T09:00:00Z",
  lastEditedAt: null,
  pinned: false,
};
const url = "https://blog.kurl.me/@hana/letters";
const label = (mark: string) => `label:${mark}`;

function meta(over: Partial<PublicPostListItem>, postKey: string | null = null) {
  return postMetadata({ author, post: { ...post, ...over }, url, postKey, shareLabel: label });
}

function serialized(value: unknown): string {
  return JSON.stringify(value);
}

describe("share cards and search signals for a post", () => {
  it.each([
    ["followers-only", { audience: "FOLLOWERS" as const, locked: { reason: "FOLLOWERS" as const } }, "label:FOLLOWERS"],
    ["password", { audience: "PASSWORD" as const }, "label:PASSWORD"],
    ["country-limited, for every viewer", { audience: "PUBLIC" as const, regionRestricted: true }, "label:REGION"],
    ["region-checked by the server", { locked: { reason: "REGION_CHECK" as const } }, "label:REGION"],
  ])("a %s post shows title, author, the generated card and a label only", (_, over, expected) => {
    const m = meta(over);
    const text = serialized(m);
    expect(text).not.toContain(post.excerpt!);
    expect(text).not.toContain(post.ogImageUrl!);
    expect(text).not.toContain("일상");
    expect(m.description).toBe(expected);
    expect(m.openGraph).toMatchObject({ title: post.title, description: expected, siteName: "@hana" });
    expect(m.twitter).toMatchObject({ description: expected, images: [`${url}/opengraph-image`] });
    expect(m.robots).toEqual({ index: false, follow: false });
    expect(m.alternates).toBeUndefined();
  });

  it("gives a keyed link-only post its normal card on the keyed address, kept out of search", () => {
    const m = meta({ audience: "UNLISTED" }, "k 1");
    expect(m.description).toBe(post.excerpt);
    expect(m.openGraph).toMatchObject({ url: `${url}?k=k%201` });
    expect(m.robots).toEqual({ index: false, follow: false });
    expect(m.alternates).toBeUndefined();
  });

  it("keeps the public card and canonical for an everyone post", () => {
    const m = meta({ audience: "PUBLIC" });
    expect(m.description).toBe(post.excerpt);
    expect(m.alternates).toEqual({ canonical: url });
    expect(m.robots).toBeUndefined();
    expect(serialized(m.openGraph)).toContain(post.ogImageUrl!);
  });
});
