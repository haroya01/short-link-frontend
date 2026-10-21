import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { CodeMirrorBlock } from "@/modules/blog/components/editor/codemirror-block";

let editor: Editor | null = null;

beforeAll(() => {
  const empty = { length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] } as unknown as DOMRectList;
  Range.prototype.getClientRects = () => empty;
  Range.prototype.getBoundingClientRect = () => new DOMRect();
});

function makeEditor(content: string) {
  const element = document.createElement("div");
  document.body.append(element);
  editor = new Editor({
    element,
    extensions: [StarterKit.configure({ codeBlock: false }), CodeMirrorBlock.configure({ languageLabel: "언어" })],
    content,
  });
  return editor;
}

async function settle() {
  await import("@/modules/blog/components/editor/codemirror-node-view");
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

describe("the code block before and after CodeMirror arrives", () => {
  it("starts as a plain editable block in the same frame, then becomes CodeMirror without touching the doc", async () => {
    const ed = makeEditor('<p>앞</p><pre><code class="language-typescript">const a = 1</code></pre>');
    const plain = ed.view.dom.querySelector("[data-code-block-plain]");
    expect(plain).not.toBeNull();
    expect(plain?.querySelector("select")?.value).toBe("typescript");
    expect(plain?.querySelector("pre code")?.textContent).toBe("const a = 1");
    expect(ed.view.dom.querySelector(".cm-editor")).toBeNull();

    const pos = ed.state.doc.child(0).nodeSize + 1 + "const a = 1".length;
    ed.view.dispatch(ed.state.tr.insertText(";", pos));
    expect(plain?.querySelector("pre code")?.textContent).toBe("const a = 1;");

    const before = ed.state.doc;
    let changes = 0;
    ed.on("update", () => (changes += 1));
    await settle();

    expect(ed.view.dom.querySelector("[data-code-block-plain]")).toBeNull();
    const cm = ed.view.dom.querySelector(".cm-codeblock .cm-content");
    expect(cm?.textContent).toBe("const a = 1;");
    expect(ed.view.dom.querySelector(".cm-codeblock select")).toHaveProperty("value", "typescript");
    expect(ed.state.doc.eq(before)).toBe(true);
    expect(changes).toBe(0);
  });

  it("opens a code block straight in CodeMirror once it has loaded", async () => {
    await settle();
    const ed = makeEditor("<pre><code>x = 1</code></pre>");
    expect(ed.view.dom.querySelector("[data-code-block-plain]")).toBeNull();
    expect(ed.view.dom.querySelector(".cm-content")?.textContent).toBe("x = 1");
  });
});
