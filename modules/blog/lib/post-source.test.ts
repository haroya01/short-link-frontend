import { describe, expect, it } from "vitest";
import { createTranslator, type AbstractIntlMessages } from "next-intl";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";
import type { PostSource } from "@/modules/blog/api/public-posts";
import { canonicalFor, httpUrl, sourcePlatformName } from "./post-source";

const source = (overrides: Partial<PostSource> = {}): PostSource => ({
  platform: "TISTORY",
  originalUrl: "https://dohyun-dev.tistory.com/42",
  shortUrl: "https://kurl.me/dh42T",
  excerptOnly: false,
  ...overrides,
});

const translator = (messages: object, locale: string) => {
  const t = createTranslator({ locale, messages: messages as AbstractIntlMessages, namespace: "publicFeed" }) as unknown as {
    (key: string): string;
    has: (key: string) => boolean;
  };
  return t;
};

describe("post source", () => {
  it("points the canonical at the original, and only at an http(s) address", () => {
    expect(canonicalFor("https://blog.kurl.me/@d/p", source())).toBe("https://dohyun-dev.tistory.com/42");
    expect(canonicalFor("https://blog.kurl.me/@d/p", null)).toBe("https://blog.kurl.me/@d/p");
    expect(canonicalFor("https://blog.kurl.me/@d/p", source({ originalUrl: "javascript:alert(1)" }))).toBe(
      "https://blog.kurl.me/@d/p",
    );
  });

  it("refuses anything but http(s) as a link", () => {
    expect(httpUrl("https://kurl.me/dh42T")).toBe("https://kurl.me/dh42T");
    expect(httpUrl("javascript:alert(1)")).toBeNull();
    expect(httpUrl("not a url")).toBeNull();
    expect(httpUrl(null)).toBeNull();
  });

  it("names each platform in ko, en and ja, and falls back to the host for one it doesn't know", () => {
    expect(sourcePlatformName(source({ platform: "NAVER" }), translator(ko, "ko"))).toBe("네이버 블로그");
    expect(sourcePlatformName(source({ platform: "BRUNCH" }), translator(en, "en"))).toBe("Brunch");
    expect(sourcePlatformName(source({ platform: "NAVER" }), translator(ja, "ja"))).toBe("NAVERブログ");
    const unknown = source({ platform: "MEDIUM" as PostSource["platform"], originalUrl: "https://medium.com/@d/x" });
    expect(sourcePlatformName(unknown, translator(ko, "ko"))).toBe("medium.com");
  });

  it("words a reader milestone with the number in every catalog", () => {
    const say = (messages: object, locale: string) =>
      createTranslator({ locale, messages: messages as AbstractIntlMessages, namespace: "notifications" }) as unknown as (
        key: string,
        values: Record<string, number>,
      ) => string;
    expect(say(ko, "ko")("post_read_milestone", { milestone: 1000 })).toBe("내 글을 1,000명이 읽었어요");
    expect(say(en, "en")("post_read_milestone", { milestone: 100 })).toBe("100 people have read your post");
    expect(say(ja, "ja")("post_read_milestone", { milestone: 10 })).toBe("あなたの記事を10人が読みました");
  });
});
