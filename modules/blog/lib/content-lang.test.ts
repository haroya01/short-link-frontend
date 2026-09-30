import { describe, expect, it } from "vitest";
import { contentLang } from "@/modules/blog/lib/content-lang";

describe("contentLang", () => {
  it("marks kana text as Japanese whatever the post declares", () => {
    expect(contentLang("JPAの永続性コンテキストについて", "ko")).toBe("ja");
    expect(contentLang("ﾃｽﾄを書く")).toBe("ja");
  });

  it("marks hangul text as Korean whatever the post declares", () => {
    expect(contentLang("K-means clustering accelerator 설계 (3)", "ja")).toBe("ko");
  });

  it("goes with the majority script when both appear", () => {
    expect(contentLang("「ありがとう」와 「すみません」의 차이를 정리했습니다")).toBe("ko");
    expect(contentLang("韓国語の「감사」を調べてみました")).toBe("ja");
  });

  it("falls back to the declared language for Latin or kanji-only text", () => {
    expect(contentLang("2024/11/15 Spring MVC DoS脆弱性 (CVE-2024-38828)", "ja")).toBe("ja");
    expect(contentLang("ERROR: k8s GPG error public key is not available", "en")).toBe("en");
  });

  it("leaves text unmarked when nothing tells its language", () => {
    expect(contentLang("Big-O")).toBeUndefined();
    expect(contentLang("密結合", "")).toBeUndefined();
    expect(contentLang(null)).toBeUndefined();
  });
});
