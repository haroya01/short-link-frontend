import { describe, expect, it } from "vitest";
import { createTranslator, type AbstractIntlMessages } from "next-intl";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";
import { CLIENT_MESSAGE_SCOPES } from "@/i18n/client-namespaces";

function entries(tree: object, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]: [string, unknown]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") return [[path, value] as [string, string]];
    return value && typeof value === "object" ? entries(value, path) : [];
  });
}

// Namespaces only the blog product renders: loaded under blog/ or p/ and by no other product's scope.
const isBlogScope = (scope: string) => scope === "blog" || scope.startsWith("blog/") || scope.startsWith("p/");
const scopes = Object.entries(CLIENT_MESSAGE_SCOPES) as [string, readonly string[]][];
const elsewhere = scopes.filter(([scope]) => scope !== "root" && !isBlogScope(scope)).flatMap(([, ns]) => ns);
const overlaps = (a: string, b: string) => a === b || a.startsWith(`${b}.`) || b.startsWith(`${a}.`);
const BLOG_ONLY = [
  ...new Set(scopes.filter(([scope]) => isBlogScope(scope)).flatMap(([, ns]) => ns)),
].filter((ns) => !elsewhere.some((other) => overlaps(ns, other)));
const inBlog = ([key]: [string, string]) => BLOG_ONLY.some((ns) => key === ns || key.startsWith(`${ns}.`));

const KANA_KANJI = "ぁ-ゖァ-ヺー一-龯々〆";

describe("message catalog style", () => {
  it("finds the blog-only namespaces from the client scopes", () => {
    expect(BLOG_ONLY).toEqual(expect.arrayContaining(["comments", "notes", "collections", "publicPost", "postEditor"]));
    expect(BLOG_ONLY).not.toContain("stats");
  });

  it("en: a counted noun on the blog goes through an ICU plural, so 1 never reads '1 likes'", () => {
    const counted = /\{(?:count|n)(?:, number)?\}\s+(?:more\s+)?(?:people|[a-z]{2,}s)\b/;
    const bare = entries(en).filter(inBlog).filter(([, value]) => !value.includes("plural,") && counted.test(value));
    expect(bare).toEqual([]);
  });

  it("en: the blog's counts read right at one and at many", () => {
    const t = createTranslator({ locale: "en", messages: en as unknown as AbstractIntlMessages }) as unknown as (
      key: string,
      values: Record<string, string | number>,
    ) => string;
    expect(t("collections.belongsToRest", { title: "Notes", count: 1 })).toBe("In “Notes” and 1 more collection");
    expect(t("collections.belongsToRest", { title: "Notes", count: 2 })).toBe("In “Notes” and 2 more collections");
    expect(t("comments.charsLeft", { count: 1 })).toBe("1 character left");
    expect(t("notes.listMembers", { count: 1 })).toBe("1 person");
    expect(t("notes.likeCount", { count: 1 })).toBe("1 like");
    expect(t("notes.replyCount", { count: 1234 })).toBe("1,234 replies");
    expect(t("blogWorkspace.analyticsPeakDay", { date: "Oct 3", count: 1 })).toBe("Peak day Oct 3 · 1 view");
  });

  it("ja: a question or exclamation mark after Japanese text is full-width", () => {
    const halfWidth = new RegExp(`[${KANA_KANJI}][?!]`);
    expect(entries(ja).filter(([, value]) => halfWidth.test(value))).toEqual([]);
  });

  it("ja: a number on the blog sits right against its counter, '3人' not '3 人'", () => {
    const spaced = /\{[a-zA-Z]+(?:, number)?\}[  ]+(?:件|人|名|回|本|分|時間|日|文字|個|枚|行|か月|ヶ月|年|秒|週|話|ページ|つ)/;
    expect(entries(ja).filter(inBlog).filter(([, value]) => spaced.test(value))).toEqual([]);
  });

  it("ko: no particle hangs on a name or address, whose final sound decides 이/가 and 을/를", () => {
    const hanging = /\{[a-zA-Z]+\}(?:<\/[a-zA-Z]+>)?(?:이|가|을|를|은|는|과|와|으로|로)(?=[\s,.!?)…·]|$)/;
    expect(entries(ko).filter(([, value]) => hanging.test(value))).toEqual([]);
  });
});
