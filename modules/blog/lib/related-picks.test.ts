import { describe, expect, it } from "vitest";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";
import { relatedPicker, titleStem } from "@/modules/blog/lib/related-picks";

function item(slug: string, title: string, username = "writer"): PublicFeedItem {
  return {
    id: slug.length,
    author: { id: 1, username, bio: null, avatarUrl: null },
    slug,
    title,
    excerpt: null,
    ogImageUrl: null,
    languageTag: "ko",
    tags: [],
    publishedAt: "2026-07-18T00:00:00Z",
    viewCount: 0,
    likeCount: 0,
  };
}

function offerAll(picker: ReturnType<typeof relatedPicker>, items: PublicFeedItem[]) {
  for (const it of items) {
    if (picker.offer(it)) break;
  }
  return picker.picks.map((p) => p.slug);
}

describe("titleStem", () => {
  it("strips a trailing episode number in half- or full-width parentheses", () => {
    expect(titleStem("K-means 설계 (3)")).toBe("K-means 설계");
    expect(titleStem("改善記録（12）")).toBe("改善記録");
    expect(titleStem("가속기 (초안)")).toBe("가속기 (초안)");
  });
});

describe("relatedPicker", () => {
  const feed = [
    item("part-3", "가속기 설계 (3)"),
    item("part-2", "가속기 설계 (2)"),
    item("part-1", "가속기 설계 (1)"),
    item("ddd", "DDD 정리"),
    item("tests", "무엇을 테스트할까"),
    item("lombok", "Lombok 생성자"),
  ];

  it("offers another part of the same title when the post is in no series", () => {
    const picker = relatedPicker({
      currentKey: "writer/part-3",
      currentTitle: "가속기 설계 (3)",
      inSeries: false,
      count: 3,
    });
    expect(offerAll(picker, feed)).toEqual(["part-2", "ddd", "tests"]);
  });

  it("leaves the other episodes to the series navigation when the post is in a series", () => {
    const picker = relatedPicker({
      currentKey: "writer/part-3",
      currentTitle: "가속기 설계 (3)",
      inSeries: true,
      count: 3,
    });
    expect(offerAll(picker, feed)).toEqual(["ddd", "tests", "lombok"]);
  });

  it("never picks the post being read, and stops at the count", () => {
    const picker = relatedPicker({
      currentKey: "writer/ddd",
      currentTitle: "DDD 정리",
      inSeries: false,
      count: 2,
    });
    expect(offerAll(picker, feed)).toEqual(["part-3", "tests"]);
    expect(picker.offer(item("late", "나중 글"))).toBe(true);
    expect(picker.picks).toHaveLength(2);
  });

  it("tells posts with the same slug by different authors apart", () => {
    const picker = relatedPicker({
      currentKey: "writer/intro",
      currentTitle: "소개",
      inSeries: false,
      count: 3,
    });
    expect(offerAll(picker, [item("intro", "소개"), item("intro", "다른 사람의 소개", "other")])).toEqual([
      "intro",
    ]);
    expect(picker.picks[0].author.username).toBe("other");
  });
});
