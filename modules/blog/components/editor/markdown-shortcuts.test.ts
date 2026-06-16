import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
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
