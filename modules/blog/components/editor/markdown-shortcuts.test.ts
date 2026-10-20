import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import CodeBlock from "@tiptap/extension-code-block";
import { CalloutQuote } from "@/modules/blog/components/editor/callout-quote";
import { MarkdownShortcuts } from "@/modules/blog/components/editor/markdown-shortcuts";

/**
 * These exercise the MOBILE code path on purpose: dispatching `tr.insertText` does NOT fire
 * ProseMirror's `handleTextInput` (so StarterKit's native input rules stay silent, exactly as they do
 * on an IME/virtual keyboard) — only our `appendTransaction` runs. So a green test here means the
 * shortcut converts even where the built-in rules don't.
 */
let editor: Editor;

function makeEditor() {
  editor = new Editor({
    element: document.createElement("div"),
    extensions: [StarterKit, MarkdownShortcuts],
    content: "<p></p>",
  });
  return editor;
}

// Type one character at a time at the caret, like a person would — so a premature/partial pattern can't
// silently pass.
function type(text: string) {
  for (const ch of text) {
    const pos = editor.state.selection.from;
    editor.view.dispatch(editor.state.tr.insertText(ch, pos));
  }
}

afterEach(() => editor?.destroy());

describe("MarkdownShortcuts (mobile input path)", () => {
  it("turns '# ' into an h1", () => {
    makeEditor();
    type("# ");
    const top = (editor.getJSON() as any).content?.[0];
    expect(top?.type).toBe("heading");
    expect(top?.attrs?.level).toBe(1);
  });

  it("turns '## ' / '### ' into h2 / h3", () => {
    makeEditor();
    type("## ");
    expect((editor.getJSON() as any).content?.[0]?.attrs?.level).toBe(2);
    makeEditor();
    type("### ");
    expect((editor.getJSON() as any).content?.[0]?.attrs?.level).toBe(3);
  });

  it("keeps the text that follows the marker as the heading body", () => {
    makeEditor();
    type("# Hello");
    const top = (editor.getJSON() as any).content?.[0];
    expect(top?.type).toBe("heading");
    expect(top?.content?.[0]?.text).toBe("Hello");
  });

  it("does NOT convert '#' without a trailing space", () => {
    makeEditor();
    type("#x");
    expect((editor.getJSON() as any).content?.[0]?.type).toBe("paragraph");
  });

  it("turns '- ' and '1. ' into lists, '> ' into a blockquote", () => {
    makeEditor();
    type("- ");
    expect((editor.getJSON() as any).content?.[0]?.type).toBe("bulletList");
    makeEditor();
    type("1. ");
    expect((editor.getJSON() as any).content?.[0]?.type).toBe("orderedList");
    makeEditor();
    type("> ");
    expect((editor.getJSON() as any).content?.[0]?.type).toBe("blockquote");
  });

  it("turns '**bold**' into a bold mark with the markers stripped", () => {
    makeEditor();
    type("**bold**");
    const text = (editor.getJSON() as any).content?.[0]?.content?.[0];
    expect(text?.text).toBe("bold");
    expect(text?.marks?.[0]?.type).toBe("bold");
  });

  it("turns '*italic*' / '`code`' / '~~gone~~' into their marks", () => {
    makeEditor();
    type("*italic*");
    let text = (editor.getJSON() as any).content?.[0]?.content?.[0];
    expect(text?.text).toBe("italic");
    expect(text?.marks?.[0]?.type).toBe("italic");

    makeEditor();
    type("`code`");
    text = (editor.getJSON() as any).content?.[0]?.content?.[0];
    expect(text?.text).toBe("code");
    expect(text?.marks?.[0]?.type).toBe("code");

    makeEditor();
    type("~~gone~~");
    text = (editor.getJSON() as any).content?.[0]?.content?.[0];
    expect(text?.text).toBe("gone");
    expect(text?.marks?.[0]?.type).toBe("strike");
  });

  it("turns a whole-paragraph '---' into a horizontal rule (mobile path)", () => {
    // The `type` helper dispatches insertText, so handleTextInput never fires — exactly the phone-IME
    // path where StarterKit's native `---` rule stayed silent and the divider was lost on publish.
    makeEditor();
    type("---");
    expect((editor.getJSON() as any).content?.[0]?.type).toBe("horizontalRule");
  });

  it("also accepts '***' and '___' as dividers (StarterKit's native rule only knew '---')", () => {
    makeEditor();
    type("***");
    expect((editor.getJSON() as any).content?.[0]?.type).toBe("horizontalRule");
    makeEditor();
    type("___");
    expect((editor.getJSON() as any).content?.[0]?.type).toBe("horizontalRule");
  });

  it("does NOT turn '--' (only two) or '---text' into a divider", () => {
    makeEditor();
    type("--");
    expect((editor.getJSON() as any).content?.[0]?.type).toBe("paragraph");
    makeEditor();
    type("---text");
    expect((editor.getJSON() as any).content?.[0]?.type).toBe("paragraph");
  });

  it("does NOT bold a half-open '**bold*'", () => {
    makeEditor();
    type("**bold*");
    const node = (editor.getJSON() as any).content?.[0];
    // still a plain paragraph whose text contains the literal markers (no bold mark yet)
    expect(node?.type).toBe("paragraph");
    expect(node?.content?.[0]?.marks ?? []).toHaveLength(0);
  });

  it("stops marking once the run is closed (caret no longer bold)", () => {
    makeEditor();
    type("**bold** next");
    const content = (editor.getJSON() as any).content?.[0]?.content ?? [];
    const bold = content.find((n: any) => n.text === "bold");
    const tail = content.find((n: any) => typeof n.text === "string" && n.text.includes("next"));
    expect(bold?.marks?.[0]?.type).toBe("bold");
    expect(tail?.marks ?? []).toHaveLength(0);
  });
});

describe("MarkdownShortcuts after a soft line break (single Enter in the editor)", () => {
  function softBreak() {
    editor.commands.setHardBreak();
  }
  function blocks() {
    return ((editor.getJSON() as any).content ?? []) as any[];
  }

  it("splits a '- ' line off into a bullet list", () => {
    makeEditor();
    type("First paragraph");
    softBreak();
    type("- one");
    const [first, second] = blocks();
    expect(first.type).toBe("paragraph");
    expect(first.content).toEqual([{ type: "text", text: "First paragraph" }]);
    expect(second.type).toBe("bulletList");
    expect(second.content?.[0]?.content?.[0]?.content?.[0]?.text).toBe("one");
  });

  it("turns a '## ' line into a heading of its own", () => {
    makeEditor();
    type("Intro");
    softBreak();
    type("## Title");
    const [first, second] = blocks();
    expect(first.content?.[0]?.text).toBe("Intro");
    expect(second.type).toBe("heading");
    expect(second.attrs?.level).toBe(2);
    expect(second.content?.[0]?.text).toBe("Title");
  });

  it("turns a '1. ' line into an ordered list", () => {
    makeEditor();
    type("Steps");
    softBreak();
    type("1. first");
    expect(blocks()[1]?.type).toBe("orderedList");
  });

  it("turns a '---' line into a divider below the text", () => {
    makeEditor();
    type("Intro");
    softBreak();
    type("---");
    const [first, second] = blocks();
    expect(first.content?.[0]?.text).toBe("Intro");
    expect(second.type).toBe("horizontalRule");
  });

  it("leaves a dash in the middle of a line as text", () => {
    makeEditor();
    type("First");
    softBreak();
    type("a - b");
    expect(blocks()).toHaveLength(1);
    expect(blocks()[0].type).toBe("paragraph");
  });
});

describe("MarkdownShortcuts GitHub-style task items", () => {
  function makeTaskEditor() {
    editor = new Editor({
      element: document.createElement("div"),
      extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true }), MarkdownShortcuts],
      content: "<p></p>",
    });
  }

  it("turns '- [ ] ' into an unchecked task and keeps typing inside it", () => {
    makeTaskEditor();
    type("- [ ] buy milk");
    const top = (editor.getJSON() as any).content?.[0];
    expect(top?.type).toBe("taskList");
    expect(top?.content?.[0]?.attrs?.checked).toBe(false);
    expect(top?.content?.[0]?.content?.[0]?.content?.[0]?.text).toBe("buy milk");
  });

  it("turns '- [x] ' into a checked task", () => {
    makeTaskEditor();
    type("- [x] done");
    expect((editor.getJSON() as any).content?.[0]?.content?.[0]?.attrs?.checked).toBe(true);
  });

  it("leaves '[ ] ' inside an existing multi-item bullet list alone", () => {
    makeTaskEditor();
    editor.commands.setContent("<ul><li><p>one</p></li><li><p></p></li></ul>");
    editor.commands.setTextSelection(editor.state.doc.content.size - 3);
    type("[ ] ");
    expect((editor.getJSON() as any).content?.[0]?.type).toBe("bulletList");
  });
});


describe("Backspace on a heading just made from '# '", () => {
  function onSecondLine() {
    editor = new Editor({
      element: document.createElement("div"),
      extensions: [StarterKit, MarkdownShortcuts],
      content: "<p>첫 줄</p><p></p>",
    });
    editor.commands.setTextSelection(editor.state.doc.child(0).nodeSize + 1);
  }

  it("keeps the caret on that line as an empty paragraph instead of joining the line above", () => {
    onSecondLine();
    type("# ");
    expect((editor.getJSON() as any).content?.[1]?.type).toBe("heading");
    const line = editor.state.selection.from;

    editor.commands.keyboardShortcut("Backspace");
    const blocks = (editor.getJSON() as any).content;
    expect(blocks.slice(0, 2).map((b: { type: string }) => b.type)).toEqual(["paragraph", "paragraph"]);
    expect(editor.state.selection.from).toBe(line);

    type("x");
    expect(editor.state.doc.child(0).textContent).toBe("첫 줄");
    expect(editor.state.doc.child(1).textContent).toBe("x");
  });

  it("leaves a heading that has text to the usual Backspace", () => {
    onSecondLine();
    type("# 제목");
    editor.commands.setTextSelection(editor.state.doc.child(0).nodeSize + 1);
    editor.commands.keyboardShortcut("Backspace");
    expect(editor.state.doc.child(0).textContent).toBe("첫 줄제목");
  });
});

describe("the app's markdown, typed on a phone keyboard", () => {
  function makeFull(content = "<p></p>") {
    editor = new Editor({
      element: document.createElement("div"),
      extensions: [StarterKit.configure({ codeBlock: false, blockquote: false }), CodeBlock, CalloutQuote, MarkdownShortcuts],
      content,
    });
    return editor;
  }

  it("turns '```js ' into a js code block", () => {
    makeFull();
    type("```js ");
    const top = (editor.getJSON() as any).content?.[0];
    expect(top?.type).toBe("codeBlock");
    expect(top?.attrs?.language).toBe("js");
  });

  it("turns '[text](url)' and '<url>' into links", () => {
    makeFull();
    type("[소개](https://kurl.me/about) <https://kurl.me>");
    const marks = (editor.getJSON() as any).content[0].content.filter((n: any) => n.marks?.[0]?.type === "link");
    expect(marks.map((n: any) => [n.text, n.marks[0].attrs.href])).toEqual([
      ["소개", "https://kurl.me/about"],
      ["https://kurl.me", "https://kurl.me"],
    ]);
  });

  it("leaves '![alt](url)' to the image rule", () => {
    makeFull();
    type("![바다](https://kurl.me/sea.png)");
    expect(JSON.stringify(editor.getJSON())).not.toContain('"link"');
  });

  it("turns a quote's '[!NOTE]' line into a note callout once the next line starts", () => {
    makeFull("<blockquote><p>[!NOTE]</p></blockquote>");
    editor.commands.setTextSelection(editor.state.doc.content.size - 2);
    editor.view.dispatch(editor.state.tr.split(editor.state.selection.from));
    const quote = (editor.getJSON() as any).content[0];
    expect(quote.type).toBe("blockquote");
    expect(quote.attrs.alert).toBe("note");
    expect(quote.content).toHaveLength(1);
  });

  it("turns ':::note warn' … ':::' across lines into a warning callout of the lines between", () => {
    makeFull("<p>앞 문단</p><p>:::note warn</p><p>조심할 것</p><p></p>");
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    type(":::");
    const blocks = (editor.getJSON() as any).content;
    expect(blocks[0].content[0].text).toBe("앞 문단");
    expect(blocks[1].type).toBe("blockquote");
    expect(blocks[1].attrs.alert).toBe("warning");
    expect(blocks[1].content.map((p: any) => p.content?.[0]?.text)).toEqual(["조심할 것"]);
  });

  it("leaves other ::: forms as written", () => {
    makeFull("<p>:::details 열기</p><p>안</p><p></p>");
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    type(":::");
    expect(JSON.stringify(editor.getJSON())).not.toContain("blockquote");
  });
});
