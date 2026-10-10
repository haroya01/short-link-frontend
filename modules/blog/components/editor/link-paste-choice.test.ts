import { afterEach, describe, expect, it } from "vitest";
import { Editor, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { planPaste } from "@/modules/blog/lib/link-paste";
import { applyPastePlan, convertChoiceToCard, linkChoiceKey, LinkPasteChoice, pasteSpot } from "./link-paste-choice";

const LinkCard = Node.create({
  name: "linkCard",
  group: "block",
  atom: true,
  addAttributes: () => ({ url: { default: "" } }),
  parseHTML: () => [{ tag: "div[data-link-card]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", { "data-link-card": "", ...HTMLAttributes }],
});

let editor: Editor;
afterEach(() => editor?.destroy());

function make(content: string) {
  editor = new Editor({
    element: document.createElement("div"),
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      LinkCard,
      LinkPasteChoice.configure({ labels: { group: "링크 모양 고르기", link: "링크", card: "카드", video: "동영상" } }),
    ],
    content,
  });
  return editor;
}

function paste(text: string) {
  return applyPastePlan(editor, planPaste(text, pasteSpot(editor.state)));
}

const linkHrefs = () => {
  const hrefs: string[] = [];
  editor.state.doc.descendants((node) => {
    node.marks.forEach((mark) => mark.type.name === "link" && hrefs.push(mark.attrs.href));
  });
  return hrefs;
};
const choice = () => linkChoiceKey.getState(editor.state);
const chip = () => editor.view.dom.querySelector("[data-link-choice]");

describe("pasting a URL in the post editor", () => {
  it("turns the selected text into a link in one undo step", () => {
    make("<p>read the guide</p>");
    editor.commands.setTextSelection({ from: 10, to: 15 });
    paste("https://kurl.me/guide");
    expect(linkHrefs()).toEqual(["https://kurl.me/guide"]);
    expect(editor.state.doc.textContent).toBe("read the guide");
    expect(choice()).toBeNull();
    editor.commands.undo();
    expect(linkHrefs()).toEqual([]);
    expect(editor.state.doc.textContent).toBe("read the guide");
  });

  it("puts a bare URL on an empty line in as a link and offers link or card beside it", () => {
    make("<p>intro</p><p></p>");
    editor.commands.setTextSelection(8);
    paste("https://kurl.me/about");
    expect(editor.state.doc.child(1).textContent).toBe("https://kurl.me/about");
    expect(linkHrefs()).toEqual(["https://kurl.me/about"]);
    expect(choice()).toMatchObject({ href: "https://kurl.me/about", video: false });
    expect([...chip()!.querySelectorAll("button")].map((b) => [b.textContent, b.getAttribute("aria-pressed")])).toEqual([
      ["링크", "true"],
      ["카드", "false"],
    ]);
  });

  it("offers video instead of card for a video URL", () => {
    make("<p></p>");
    paste("https://youtu.be/dQw4w9WgXcQ");
    expect(choice()).toMatchObject({ video: true });
    expect(chip()!.textContent).toBe("링크동영상");
  });

  it("drops the choice as soon as the writer types on", () => {
    make("<p></p>");
    paste("https://kurl.me");
    expect(choice()).not.toBeNull();
    editor.commands.insertContent(" and more");
    expect(choice()).toBeNull();
    expect(chip()).toBeNull();
  });

  it("turns the line into a card when card is picked, and undo brings the link back", () => {
    make("<p>intro</p><p></p>");
    editor.commands.setTextSelection(8);
    paste("https://kurl.me/about");
    convertChoiceToCard(editor.view);
    expect(editor.state.doc.child(1).type.name).toBe("linkCard");
    expect(editor.state.doc.child(1).attrs.url).toBe("https://kurl.me/about");
    expect(choice()).toBeNull();
    editor.commands.undo();
    expect(editor.state.doc.child(1).type.name).toBe("paragraph");
    expect(linkHrefs()).toEqual(["https://kurl.me/about"]);
  });

  it("keeps a URL pasted mid-sentence a plain link with no choice, and what follows unlinked", () => {
    make("<p></p>");
    editor.commands.insertContent("see ");
    paste("https://kurl.me");
    editor.commands.insertContent(" now");
    expect(editor.state.doc.textContent).toBe("see https://kurl.me now");
    expect(linkHrefs()).toEqual(["https://kurl.me"]);
    expect(choice()).toBeNull();
  });

  it("treats an empty line after a soft break as an empty line, and card splits the paragraph around it", () => {
    make("<p>intro</p>");
    editor.commands.setTextSelection(6);
    editor.commands.setHardBreak();
    paste("https://kurl.me/about");
    expect(choice()).toMatchObject({ href: "https://kurl.me/about" });
    convertChoiceToCard(editor.view);
    const kinds = Array.from({ length: editor.state.doc.childCount }, (_, i) => editor.state.doc.child(i));
    expect(kinds.map((node) => [node.type.name, node.textContent])).toEqual([
      ["paragraph", "intro"],
      ["linkCard", ""],
      ["paragraph", ""],
    ]);
    expect(kinds[0].lastChild?.type.name).toBe("text");
  });

  it("splits a paragraph whose soft line sits between two others", () => {
    make("<p>intro</p>");
    editor.commands.setTextSelection(6);
    editor.commands.setHardBreak();
    editor.commands.setHardBreak();
    editor.commands.insertContent("outro");
    editor.commands.setTextSelection(7);
    paste("https://kurl.me/about");
    convertChoiceToCard(editor.view);
    const kinds = Array.from({ length: editor.state.doc.childCount }, (_, i) => editor.state.doc.child(i));
    expect(kinds.map((node) => [node.type.name, node.textContent])).toEqual([
      ["paragraph", "intro"],
      ["linkCard", ""],
      ["paragraph", "outro"],
    ]);
  });

  it("keeps a URL pasted at the start of a line that already has text a plain link", () => {
    make("<p>intro</p>");
    editor.commands.setTextSelection(1);
    paste("https://kurl.me");
    expect(choice()).toBeNull();
    expect(editor.state.doc.textContent).toBe("https://kurl.meintro");
  });

  it("closes the choice on Escape", () => {
    make("<p></p>");
    paste("https://kurl.me");
    editor.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(choice()).toBeNull();
  });
});
