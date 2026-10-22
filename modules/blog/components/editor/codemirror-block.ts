import CodeBlock from "@tiptap/extension-code-block";
import { InputRule, type Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorView as PMEditorView, ViewMutationRecord } from "@tiptap/pm/view";
import { codeBlockFrame } from "@/modules/blog/components/editor/code-block-frame";
import { fenceFor } from "@/modules/blog/lib/markdown-to-blocks";

type CodeMirrorModule = typeof import("@/modules/blog/components/editor/codemirror-node-view");

let codeMirror: CodeMirrorModule | null = null;
let codeMirrorLoad: Promise<CodeMirrorModule> | null = null;
const upgraded = new WeakSet<PMEditorView>();

function loadCodeMirror(view: PMEditorView) {
  codeMirrorLoad ??= import("@/modules/blog/components/editor/codemirror-node-view").then((mod) => {
    codeMirror = mod;
    return mod;
  });
  void codeMirrorLoad.then(() => {
    if (view.isDestroyed || upgraded.has(view)) return;
    upgraded.add(view);
    const views = view.props.nodeViews ?? {};
    const make = views.codeBlock;
    if (!make) return;
    view.setProps({ nodeViews: { ...views, codeBlock: (...args) => make(...args) } });
  });
}

class PlainCodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private languageSelect: HTMLSelectElement;

  constructor(
    public node: PMNode,
    private view: PMEditorView,
    private getPos: () => number | undefined,
    languageLabel: string,
  ) {
    const frame = codeBlockFrame(languageLabel, node.attrs.language || "");
    this.dom = frame.dom;
    this.dom.dataset.codeBlockPlain = "";
    this.languageSelect = frame.languageSelect;
    this.languageSelect.addEventListener("change", () => {
      const pos = this.getPos();
      if (pos == null) return;
      this.view.dispatch(this.view.state.tr.setNodeAttribute(pos, "language", this.languageSelect.value || null));
    });
    const pre = document.createElement("pre");
    pre.className =
      "m-0 whitespace-pre-wrap break-words bg-transparent px-1 py-1 font-mono text-[13.5px] leading-[1.7] text-[#e5e8e6] outline-none";
    pre.style.fontFamily = "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";
    this.contentDOM = document.createElement("code");
    pre.append(this.contentDOM);
    frame.body.append(pre);
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type || codeMirror) return false;
    this.node = node;
    this.languageSelect.value = node.attrs.language || "";
    return true;
  }

  ignoreMutation(mutation: ViewMutationRecord): boolean {
    return !this.contentDOM.contains(mutation.target);
  }

  stopEvent(event: Event): boolean {
    return event.target === this.languageSelect;
  }
}

export interface CodeMirrorBlockOptions {
  /** Localized label for the code-language picker (title + aria-label). The editor passes t("codeLanguage"). */
  languageLabel: string;
}

/** Tiptap CodeBlock with the CodeMirror editing surface. Disable StarterKit's `codeBlock` and use this. */
export const CodeMirrorBlock = CodeBlock.extend<CodeMirrorBlockOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      languageLabel: "",
    };
  },
  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void; text: (s: string, escape?: boolean) => void; ensureNewLine: () => void; closeBlock: (n: PMNode) => void },
          node: PMNode,
        ) {
          const fence = fenceFor(node.textContent);
          state.write(fence + (node.attrs.language || "") + "\n");
          state.text(node.textContent, false);
          state.ensureNewLine();
          state.write(fence);
          state.closeBlock(node);
        },
      },
    };
  },
  addNodeView() {
    const { languageLabel } = this.options;
    return ({ node, view, getPos }) => {
      const pos = getPos as () => number | undefined;
      if (codeMirror) return new codeMirror.CodeMirrorNodeView(node, view, pos, languageLabel);
      loadCodeMirror(view);
      return new PlainCodeView(node, view, pos, languageLabel);
    };
  },
  // Keep CodeBlock's own ``` rules (they fire only at a paragraph START) and add one for the
  // Medium-style Enter flow: new visual lines are soft breaks (hardBreak) inside ONE paragraph, so a
  // ``` typed after Enter sits mid-paragraph, never at a textblock start. This matches ```lang + space
  // anywhere, swallows a preceding soft break, splits the prose off, and turns the rest into a code
  // block. (At a real paragraph start the parent rule above wins first, so this only covers the gap.)
  addInputRules() {
    const parentRules = this.parent?.() ?? [];
    const typeName = this.type.name;
    return [
      ...parentRules,
      new InputRule({
        find: /```([a-zA-Z0-9+#.-]*)[ ]$/,
        handler: ({ state, range, match, chain }) => {
          const language = match[1] || null;
          let from = range.from;
          const before = state.doc.resolve(from).nodeBefore;
          if (before?.type.name === "hardBreak") from -= before.nodeSize;
          chain()
            .deleteRange({ from, to: range.to })
            .splitBlock()
            .setNode(typeName, language ? { language } : {})
            .run();
        },
      }),
    ];
  },
});

/**
 * Insert a code block from the toolbar / slash menu. Unlike `toggleCodeBlock`, this never swallows
 * the current paragraph's prose: an empty textblock is converted in place, but a paragraph with text
 * gets a FRESH empty code block inserted right after it, with the caret moved inside (CodeMirror
 * focuses on selection). Toggling while already inside a code block exits back to a paragraph.
 */
export function insertCodeBlock(editor: Editor, language: string | null = null) {
  const attrs = language ? { language } : {};
  const { $from, empty } = editor.state.selection;
  const parent = $from.parent;

  // Already in a code block → toggle off (parity with the toolbar's active state).
  if (parent.type.name === "codeBlock") {
    return editor.chain().focus().setNode("paragraph").run();
  }

  // Empty textblock → convert it in place (matches the ``` markdown shortcut at line start).
  if (empty && parent.isTextblock && parent.content.size === 0) {
    return editor.chain().focus().setNode("codeBlock", attrs).run();
  }

  // Otherwise insert a new empty code block after the current top-level block, caret inside.
  const insertAt = $from.depth >= 1 ? $from.after(1) : $from.pos;
  return editor
    .chain()
    .focus()
    .insertContentAt(insertAt, { type: "codeBlock", attrs })
    .setTextSelection(insertAt + 1)
    .run();
}
