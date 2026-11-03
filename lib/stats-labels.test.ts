import { describe, expect, it } from "vitest";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";
import { statsLabels } from "./stats-labels";

function translator(catalog: Record<string, unknown>) {
  return (key: string, values?: Record<string, string | number>) => {
    const found = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], catalog);
    if (typeof found !== "string") throw new Error(`missing statLabels.${key}`);
    return found.replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? ""));
  };
}

const koLabels = statsLabels(translator(ko.statLabels), "ko");

describe("stored stats values read as people's words", () => {
  it("names channels and devices instead of the classifier keys", () => {
    expect(["social", "messaging", "search", "email", "newsletter", "other", "direct"].map(koLabels.channel)).toEqual([
      "소셜", "메신저", "검색", "이메일", "뉴스레터", "기타", "직접 유입",
    ]);
    expect(["mobile", "desktop", "tablet", "bot", "unknown"].map(koLabels.device)).toEqual([
      "모바일", "데스크톱", "태블릿", "자동 접속", "기타",
    ]);
    expect(koLabels.channel("brand-new")).toBe("brand-new");
  });

  it("strips the stored bot prefixes and names the service behind a preview", () => {
    expect(koLabels.bot("preview:kakaotalk-scrap")).toBe("미리보기 · 카카오톡");
    expect(koLabels.bot("preview:slackbot-linkexpanding")).toBe("미리보기 · Slack");
    expect(koLabels.bot("preview:prefetch")).toBe("미리 불러오기");
    expect(koLabels.bot("datacenter:Amazon.com, Inc.")).toBe("데이터센터 · Amazon.com, Inc.");
    expect(koLabels.bot("datacenter:unknown")).toBe("데이터센터");
    expect(koLabels.bot("rate-flood")).toBe("짧은 시간 반복 접속");
    expect(koLabels.bot("Googlebot")).toBe("Googlebot");
    expect(koLabels.bot("unknown")).toBe("알 수 없음");
  });

  it("spells out languages, countries and profile sources", () => {
    expect(koLabels.language("ja")).toBe("일본어");
    expect(koLabels.country("jp")).toBe("일본");
    expect(koLabels.country("UN")).toBe("알 수 없음");
    expect(koLabels.source("profile-dohyun")).toBe("프로필 @dohyun");
    expect(koLabels.source("poster-a")).toBe("poster-a");
    expect(koLabels.os("unknown")).toBe("알 수 없음");
  });

  it("has every label in Japanese and English too", () => {
    const jaLabels = statsLabels(translator(ja.statLabels), "ja");
    const enLabels = statsLabels(translator(en.statLabels), "en");
    expect(jaLabels.bot("preview:kakaotalk-scrap")).toBe("プレビュー · カカオトーク");
    expect(jaLabels.channel("messaging")).toBe("メッセージアプリ");
    expect(enLabels.bot("datacenter:Google LLC")).toBe("Datacenter · Google LLC");
    expect(enLabels.device("bot")).toBe("Automated");
  });
});
