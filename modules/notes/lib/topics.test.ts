import { describe, expect, it } from "vitest";
import type { Topic } from "@/modules/notes/api/topics";
import {
  TOPIC_ROWS,
  languageName,
  repeatsPageLink,
  sameLink,
  startTags,
  topicGroups,
  topicMeta,
  topicTitle,
} from "./topics";

function tag(name: string, own: boolean, language: string | null = own ? "ko" : "ja", people = 5): Topic {
  return { id: `tag:${name.toLowerCase()}`, kind: "tag", tag: name, language, own, people, related: [] };
}

function link(
  url: string,
  own: boolean,
  { source = null, title = "제목", language = own ? "ko" : "ja" }: { source?: string | null; title?: string | null; language?: string | null } = {},
): Topic {
  return { id: `link:${url}`, kind: "link", url, title, source, language, own, people: 5 };
}

const ranks = (rows: { topic: Topic; rank: number }[]) => rows.map((row) => `${row.rank}:${row.topic.id}`);

describe("topic rows", () => {
  it("puts the reader's language first and numbers both groups in one run", () => {
    const groups = topicGroups([tag("첫눈", true), tag("산책", true), tag("朝の一枚", false), tag("caturday", false, "en")]);
    expect(ranks(groups.own)).toEqual(["1:tag:첫눈", "2:tag:산책"]);
    expect(ranks(groups.other)).toEqual(["3:tag:朝の一枚", "4:tag:caturday"]);
    expect(groups.more).toBe(false);
  });

  it("moves an own-language row the server sent late above the other languages, keeping the order inside each group", () => {
    const groups = topicGroups([tag("朝の一枚", false), tag("첫눈", true), tag("caturday", false, "en"), tag("산책", true)]);
    expect(ranks(groups.own)).toEqual(["1:tag:첫눈", "2:tag:산책"]);
    expect(ranks(groups.other)).toEqual(["3:tag:朝の一枚", "4:tag:caturday"]);
  });

  it("shows ten and says there are more only when the server sent more than ten", () => {
    const twelve = Array.from({ length: 12 }, (_, i) => tag(`t${i}`, i < 7));
    const capped = topicGroups(twelve);
    expect(capped.own).toHaveLength(7);
    expect(capped.other).toHaveLength(TOPIC_ROWS - 7);
    expect(capped.other.at(-1)?.rank).toBe(10);
    expect(capped.more).toBe(true);
    expect(topicGroups(twelve.slice(0, 10)).more).toBe(false);
  });

  it("lays out the whole list when there is no cap, ranks still continuous", () => {
    const all = topicGroups(Array.from({ length: 24 }, (_, i) => tag(`t${i}`, i % 2 === 0)), null);
    expect(all.own).toHaveLength(12);
    expect(all.other.map((row) => row.rank)).toEqual(Array.from({ length: 12 }, (_, i) => i + 13));
    expect(all.more).toBe(false);
  });

  it("has one group when nothing is in the reader's language", () => {
    const groups = topicGroups([tag("朝の一枚", false), tag("caturday", false, "en")]);
    expect(groups.own).toEqual([]);
    expect(ranks(groups.other)).toEqual(["1:tag:朝の一枚", "2:tag:caturday"]);
  });
});

describe("a topic row's meta line", () => {
  it("is the source on a link row", () => {
    expect(topicMeta(link("https://saebyeok.example/a", true, { source: "새벽일보" }), "ko")).toBe("새벽일보");
  });

  it("falls back to the host without www when there is no source", () => {
    expect(topicMeta(link("https://www.gilmok.example/essay", true), "ko")).toBe("gilmok.example");
    expect(topicMeta(link("https://notes.tidepool.example/a", true), "ko")).toBe("notes.tidepool.example");
  });

  it("is absent on a tag row in the reader's language", () => {
    expect(topicMeta(tag("첫눈", true), "ko")).toBeNull();
  });

  it("appends the language name on rows of another language, in the reader's locale", () => {
    expect(topicMeta(tag("朝の一枚", false), "ko")).toBe("일본어");
    expect(topicMeta(link("https://aozora.example/a", false, { source: "あおぞら新聞" }), "ko")).toBe("あおぞら新聞 · 일본어");
    expect(topicMeta(link("https://harborpost.example/a", false, { source: "Harbor Post", language: "en" }), "ja")).toBe(
      "Harbor Post · 英語",
    );
    expect(topicMeta(tag("첫눈", false, "ko"), "en")).toBe("Korean");
  });

  it("names no language when it is unknown or not a language", () => {
    expect(topicMeta(tag("nowplaying", false, null), "ko")).toBeNull();
    expect(topicMeta(link("https://quay.example/a", false, { source: "Quay", language: null }), "ko")).toBe("Quay");
    expect(languageName("zz", "ko")).toBeNull();
    expect(languageName("not a code", "ko")).toBeNull();
  });

  it("never names the language on an own-language row", () => {
    expect(topicMeta(link("https://saebyeok.example/a", true, { source: "새벽일보", language: "ko" }), "ko")).toBe("새벽일보");
  });
});

describe("a topic row's title", () => {
  it("is the tag with its hash, or the headline", () => {
    expect(topicTitle(tag("첫눈", true))).toBe("#첫눈");
    expect(topicTitle(link("https://saebyeok.example/a", true, { title: "도서관 야간 개방" }))).toBe("도서관 야간 개방");
  });

  it("is the address without its scheme when a link has no headline", () => {
    expect(topicTitle(link("https://saebyeok.example/a", true, { title: null }))).toBe("saebyeok.example/a");
  });
});

describe("search-start tags from topics", () => {
  it("takes tag topics only, the reader's language first, five at most", () => {
    const topics = [
      link("https://saebyeok.example/a", true),
      tag("朝の一枚", false),
      tag("첫눈", true),
      tag("caturday", false, "en"),
      tag("산책", true),
      tag("読書記録", false),
      tag("shelfie", false, "en"),
      tag("rainwalk", false, "en"),
    ];
    expect(startTags(topics)).toEqual(["첫눈", "산책", "朝の一枚", "caturday", "読書記録"]);
    expect(startTags([link("https://saebyeok.example/a", true)])).toEqual([]);
  });
});

describe("the link page's own link", () => {
  const preview = (url: string) => ({ url, title: "도서관 야간 개방", description: null, image: null });
  const page = "https://saebyeok.example/local/library-night";

  it("matches the same address written two ways, and nothing else", () => {
    expect(sameLink("https://Saebyeok.example", "https://saebyeok.example/")).toBe(true);
    expect(sameLink(page, `${page}?ref=home`)).toBe(false);
    expect(sameLink("javascript:alert(1)", "not a url")).toBe(false);
  });

  it("is dropped from a post that says something besides the link", () => {
    expect(repeatsPageLink(`10시까지면 얘기가 다르지.\n${page}`, preview(page), page)).toBe(true);
    expect(repeatsPageLink(`대출도 되는지가 중요한데 ${page} 기사엔 된다고 나와 있다`, preview(page), page)).toBe(true);
  });

  it("stays on a post that is only the link", () => {
    expect(repeatsPageLink(page, preview(page), page)).toBe(false);
    expect(repeatsPageLink(`  ${page}\n`, preview(page), page)).toBe(false);
  });

  it("stays when the preview is of another link, or the page is not a link page", () => {
    const other = "https://salim.example/money/lunchbox-price";
    expect(repeatsPageLink(`같이 볼 만한 기사 ${other}`, preview(other), page)).toBe(false);
    expect(repeatsPageLink(`10시까지면 얘기가 다르지. ${page}`, preview(page), null)).toBe(false);
    expect(repeatsPageLink("링크 없는 글", null, page)).toBe(false);
  });
});
