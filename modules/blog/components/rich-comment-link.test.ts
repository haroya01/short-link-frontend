import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { CommentLink } from "./comment-link";
import { applyPastePlan, pasteSpot } from "./editor/link-paste-choice";
import { linkOnly, planPaste } from "@/modules/blog/lib/link-paste";

let editor: Editor;
afterEach(() => editor?.destroy());

function commentEditor(content = "") {
  editor = new Editor({
    extensions: [
      StarterKit.configure({ heading: false, orderedList: false, horizontalRule: false, strike: false, link: false }),
      CommentLink.configure({ openOnClick: false }),
      Markdown.configure({ html: false, breaks: true }),
    ],
    content,
  });
  return editor;
}
const markdown = () => (editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();
const paste = (text: string) => applyPastePlan(editor, linkOnly(planPaste(text, pasteSpot(editor.state))));
const COMMENT_LINK = /\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)/;

describe("links in the comment input", () => {
  it("writes a pasted bare address as [address](address), the only link form comments render", () => {
    commentEditor();
    editor.commands.focus("end");
    expect(paste("https://kurl.me/docs")).toBe(true);
    expect(markdown()).toBe("[https://kurl.me/docs](https://kurl.me/docs)");
    expect(markdown()).toMatch(COMMENT_LINK);
  });

  it("links the selected word to a pasted address, and one undo takes it back", () => {
    commentEditor("read the guide");
    editor.commands.setTextSelection({ from: 10, to: 15 });
    expect(paste("https://kurl.me/guide")).toBe(true);
    expect(markdown()).toBe("read the [guide](https://kurl.me/guide)");
    editor.commands.undo();
    expect(markdown()).toBe("read the guide");
  });

  it("makes a mid-sentence paste a plain link and keeps typing outside it", () => {
    commentEditor();
    editor.chain().focus("end").insertContent({ type: "text", text: "자세한 건 " }).run();
    paste("https://kurl.me/docs");
    editor.commands.insertContent({ type: "text", text: " 참고" });
    expect(markdown()).toBe("자세한 건 [https://kurl.me/docs](https://kurl.me/docs) 참고");
  });

  it("never offers the card choice, since comments have no card blocks", () => {
    commentEditor();
    editor.commands.focus("end");
    expect(planPaste("https://kurl.me/about", pasteSpot(editor.state)).kind).toBe("link-with-choice");
    paste("https://kurl.me/about");
    expect(editor.state.plugins.some((plugin) => (plugin as unknown as { key: string }).key.startsWith("linkPasteChoice"))).toBe(false);
    expect(editor.schema.nodes.linkCard).toBeUndefined();
  });
});
