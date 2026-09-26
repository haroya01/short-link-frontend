import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { fenceFor, markdownToBlocks } from "@/modules/blog/lib/markdown-to-blocks";
import { parseCallout } from "@/modules/blog/lib/callout";
import { CjkFriendlyMarkdown, MarkdownBold, TightTaskLists, MarkdownHardBreak, MarkdownHeading, MarkdownItalic, MarkdownStrike, MarkdownText } from "./markdown-serialization";

function roundTrip(md: string): string {
  const editor = new Editor({
    extensions: [
      StarterKit.configure({ heading: false, hardBreak: false, text: false, bold: false, italic: false, strike: false }),
      MarkdownText,
      MarkdownHardBreak,
      MarkdownHeading,
      MarkdownBold,
      MarkdownItalic,
      MarkdownStrike,
      CjkFriendlyMarkdown,
      Markdown.configure({ html: false, breaks: true }),
    ],
    content: md,
  });
  const out = (editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();
  editor.destroy();
  return out;
}

describe("editor markdown round trip keeps real posts intact", () => {
  it("keeps bold that touches Japanese or Korean text", () => {
    for (const md of ["テストで**エラー率98%**が出た。", "결과는 **98%**였다"]) {
      const once = roundTrip(md);
      expect(once).not.toContain("\\*");
      expect(once).toMatch(/\*\*[^*]+\*\*/);
      expect(roundTrip(once)).toBe(once);
    }
  });

  it("does not turn arrows and comparisons into HTML entities", () => {
    expect(roundTrip("50回 -> 1回, a < b, c > d")).toBe("50回 -> 1回, a < b, c > d");
  });

  it("still neutralizes text that looks like an HTML tag", () => {
    expect(roundTrip("use \\<script> tags")).toContain("&lt;script");
  });

  it("keeps every line of a multi-line quote inside the quote", () => {
    const md = "> ℹ️ **Note**\n> **VMとは？**\n> VMは技術です。";
    const out = roundTrip(md);
    expect(out.split("\n").every((line) => line.startsWith(">"))).toBe(true);
    expect(out).not.toContain("****");
    expect(markdownToBlocks(out).map((b) => b.type)).toEqual(["QUOTE"]);
  });

  it("keeps a bold paragraph after a list inside a quote", () => {
    const md = "> ℹ️ **Note**\n> 再確認\n>\n> - 一次キャッシュ\n> - スナップショット\n>\n> **簡単に言えば、まとめです。**";
    const out = roundTrip(md);
    expect(out).not.toContain("****");
    expect(out.split("\n").every((line) => line.startsWith(">"))).toBe(true);
    expect(out).toContain("> **簡単に言えば、まとめです。**");
  });

  it("keeps italic and strike at the start of a quoted line", () => {
    const out = roundTrip("> 前\n> *強調*\n> ~~取り消し~~");
    expect(out.split("\n").every((line) => line.startsWith(">"))).toBe(true);
    expect(out).toContain("*強調*");
    expect(out).toContain("~~取り消し~~");
  });

  it("keeps fourth-level headings", () => {
    expect(roundTrip("#### 同期処理パイプライン")).toBe("#### 同期処理パイプライン");
  });

  it("keeps a code block inside a list item in the same list block", () => {
    const out = roundTrip("- 自動変換です\n    ```java\n    int a = 10;\n    ```\n- 強制変換");
    const blocks = markdownToBlocks(out);
    expect(blocks.map((b) => b.type)).toEqual(["LIST_BULLET"]);
    expect(blocks[0].content).toContain("int a = 10;");
  });

  it("keeps a sub-list after a blank line in the same list block", () => {
    const blocks = markdownToBlocks("1. 前\n\n2. **構文解析**\n\n   - **字句**: トークン化\n   - **シンボル**: 生成");
    expect(blocks.map((b) => b.type)).toEqual(["LIST_NUMBERED", "LIST_NUMBERED"]);
    expect(blocks[1].content).toContain("- **字句**");
  });

  it("keeps a code block that itself contains a fence in one block", () => {
    const code = "## 確認\n```bash\ndocker compose up\n```\n> ⚠️ **注意**";
    const blocks = markdownToBlocks(fenceFor(code) + "markdown\n" + code + "\n" + fenceFor(code));
    expect(blocks).toEqual([{ type: "CODE", content: JSON.stringify({ lang: "markdown", code }) }]);
  });

  it("does not end a code block on a fence line that carries a language", () => {
    const blocks = markdownToBlocks("```\nfirst\n```java\nsecond\n```");
    expect(blocks.map((b) => b.type)).toEqual(["CODE"]);
  });

  it("keeps table rows whose cells contain a pipe", async () => {
    const { AlignableTable, AlignableTableCell, AlignableTableHeader } = await import("./table-with-align");
    const { TableRow } = await import("@tiptap/extension-table-row");
    const md = "| 演算子 | 説明 |\n| --- | --- |\n| `&&` | AND |\n| `\\|\\|` | OR |";
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ hardBreak: false, text: false, bold: false, italic: false, strike: false }),
        MarkdownText,
        MarkdownHardBreak,
        AlignableTable,
        TableRow,
        AlignableTableHeader,
        AlignableTableCell,
        Markdown.configure({ html: false, breaks: true }),
      ],
      content: md,
    });
    const out = (editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();
    editor.destroy();
    const rows = out.split("\n").filter((l) => l.startsWith("|"));
    expect(rows).toHaveLength(4);
    expect(rows[3]).toContain("\\|\\|");
  });
});


describe("callout boxes in the editor", () => {
  async function calloutRoundTrip(md: string) {
    const { CalloutQuote } = await import("./callout-quote");
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ heading: false, blockquote: false, hardBreak: false, text: false, bold: false, italic: false, strike: false }),
        MarkdownText,
        MarkdownHardBreak,
        MarkdownHeading,
        CalloutQuote.configure({ labels: { note: "ノート", tip: "ヒント", important: "重要", warning: "注意", caution: "警告" } }),
        MarkdownBold,
        MarkdownItalic,
        MarkdownStrike,
        CjkFriendlyMarkdown,
        Markdown.configure({ html: false, breaks: true }),
      ],
      content: md,
    });
    const html = editor.getHTML();
    const out = (editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();
    return { editor, html, out };
  }

  it("opens an alert quote as a box and saves it back unchanged", async () => {
    const md = "> [!WARNING]\n> **なぜ？**\n> 説明です。";
    const { editor, html, out } = await calloutRoundTrip(md);
    expect(html).toContain('data-alert="warning"');
    expect(html).toContain('data-label="注意"');
    expect(html).not.toContain("[!WARNING]");
    expect(out).toBe("> [!WARNING]\n> **なぜ？**\\\n> 説明です。");
    expect(parseCallout(markdownToBlocks(out)[0].content)?.kind).toBe("warning");
    editor.destroy();
  });

  it("turns the current paragraph into a box and changes the kind in place", async () => {
    const { editor } = await calloutRoundTrip("メモです");
    editor.commands.setTextSelection(1);
    editor.commands.setCallout("note");
    expect((editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown()).toBe("> [!NOTE]\n> メモです");
    editor.commands.setCallout("tip");
    expect((editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown()).toBe("> [!TIP]\n> メモです");
    editor.destroy();
  });

  it("leaves a plain quote as a plain quote", async () => {
    const { editor, html, out } = await calloutRoundTrip("> ただの引用");
    expect(html).not.toContain("data-alert");
    expect(out).toBe("> ただの引用");
    editor.destroy();
  });
});

describe("checklists in the editor", () => {
  it("opens and saves a checklist without changing it", async () => {
    const { TaskItem, TaskList } = await import("@tiptap/extension-list");
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ hardBreak: false, text: false, bold: false, italic: false, strike: false }),
        MarkdownText,
        MarkdownHardBreak,
        MarkdownBold,
        TaskList,
        TaskItem.configure({ nested: true }),
        TightTaskLists,
        Markdown.configure({ html: false, breaks: true }),
      ],
      content: "- [ ] 買い物\n- [x] **洗濯**",
    });
    expect(editor.getHTML()).toContain('data-type="taskList"');
    const out = (editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();
    editor.destroy();
    expect(out).toBe("- [ ] 買い物\n- [x] **洗濯**");
    expect(markdownToBlocks(out)).toEqual([{ type: "LIST_BULLET", content: "- [ ] 買い物\n- [x] **洗濯**" }]);
  });
});

