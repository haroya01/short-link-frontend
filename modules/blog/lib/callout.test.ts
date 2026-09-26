import { describe, expect, it } from "vitest";
import { convertCalloutContainers, legacyCalloutKind, parseCallout } from "./callout";
import { markdownToBlocks } from "./markdown-to-blocks";

describe("callout", () => {
  it("reads a GitHub-style alert quote", () => {
    expect(parseCallout("[!WARNING]\n**気をつけて**\n本文")).toEqual({ kind: "warning", body: "**気をつけて**\n本文" });
    expect(parseCallout("[!note]")).toEqual({ kind: "note", body: "" });
    expect(parseCallout("ただの引用")).toBeNull();
    expect(parseCallout("[!NOTE] 同じ行に本文")).toBeNull();
  });

  it("maps the imported emoji labels to a kind", () => {
    expect(legacyCalloutKind("ℹ️ **Note**")).toBe("note");
    expect(legacyCalloutKind("⚠️ **注意**")).toBe("warning");
    expect(legacyCalloutKind("❗ **警告**")).toBe("caution");
  });

  it("turns Qiita and Zenn containers into alert quotes that save as one quote block", () => {
    const md = "前\n\n:::note warn\n**なぜ？**\n説明です。\n\n続き\n:::\n\n後";
    const out = convertCalloutContainers(md);
    expect(out).toBe("前\n\n> [!WARNING]\n> **なぜ？**\n> 説明です。\n>\n> 続き\n\n後");
    const quote = markdownToBlocks(out).find((b) => b.type === "QUOTE");
    expect(parseCallout(quote?.content)).toEqual({ kind: "warning", body: "**なぜ？**\n説明です。\n\n続き" });
    expect(convertCalloutContainers(":::message alert\n危険\n:::")).toBe("> [!CAUTION]\n> 危険");
    expect(convertCalloutContainers(":::details 開く\n中身\n:::")).toBe(":::details 開く\n中身\n:::");
  });

  it("leaves box syntax inside code alone", () => {
    const md = "```markdown\n:::note warn\n例\n:::\n```";
    expect(convertCalloutContainers(md)).toBe(md);
  });
});

