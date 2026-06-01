import CodeBlock from "@tiptap/extension-code-block";
import { Selection, TextSelection } from "@tiptap/pm/state";
import { exitCode } from "@tiptap/pm/commands";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorView as PMEditorView } from "@tiptap/pm/view";
import { Compartment } from "@codemirror/state";
import { drawSelection, EditorView as CMView, keymap as cmKeymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  defaultHighlightStyle,
  indentUnit,
  LanguageDescription,
  syntaxHighlighting,
} from "@codemirror/language";
import { languages } from "@codemirror/language-data";

/**
 * A Tiptap code-block node whose editing surface IS CodeMirror 6 — so code gets language-aware
 * syntax highlighting AND real auto-indent (Enter keeps indentation, Tab indents, language modes
 * handle brackets) while typing, not just on the published page. The block still serialises to a
 * ```lang fenced block via tiptap-markdown, so the markdown↔blocks round-trip is unchanged.
 *
 * The ProseMirror↔CodeMirror bridge (forwardUpdate / cursor hand-off at the block edges) follows the
 * canonical prosemirror-codemirror integration so arrows, Backspace and Mod-Enter cross the boundary
 * naturally.
 */

const LANGUAGES = [
  "plaintext", "javascript", "typescript", "jsx", "tsx", "json", "html", "css",
  "python", "java", "kotlin", "go", "rust", "c", "cpp", "csharp", "php", "ruby",
  "sql", "yaml", "bash", "markdown",
];

const cmTheme = CMView.theme({
  "&": { backgroundColor: "transparent", color: "#e2e8f0", fontSize: "13.5px" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
    lineHeight: "1.7",
  },
  ".cm-content": { padding: "0.25rem 0" },
  ".cm-line": { padding: "0 0.25rem" },
  ".cm-cursor": { borderLeftColor: "#34d399" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(52,211,153,0.18)",
  },
});

class CodeMirrorNodeView {
  dom: HTMLElement;
  private cm: CMView;
  private langCompartment = new Compartment();
  private updating = false;

  constructor(
    public node: PMNode,
    private view: PMEditorView,
    private getPos: () => number | undefined,
  ) {
    this.cm = new CMView({
      doc: this.node.textContent,
      extensions: [
        cmKeymap.of([
          ...this.codeMirrorKeymap(),
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        drawSelection(),
        history(),
        indentUnit.of("  "),
        CMView.lineWrapping,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        this.langCompartment.of([]),
        CMView.updateListener.of((u) => {
          if (!this.updating && u.docChanged) this.forwardUpdate();
        }),
        cmTheme,
      ],
    });

    this.dom = document.createElement("div");
    this.dom.className =
      "cm-codeblock relative my-4 overflow-hidden rounded-xl bg-slate-900 text-slate-100";

    const bar = document.createElement("div");
    bar.className = "flex justify-end border-b border-white/10 px-2 py-1";
    const select = document.createElement("select");
    select.className =
      "rounded bg-transparent px-1 py-0.5 text-[11px] text-slate-400 outline-none hover:text-slate-200";
    select.contentEditable = "false";
    for (const lang of LANGUAGES) {
      const opt = document.createElement("option");
      opt.value = lang === "plaintext" ? "" : lang;
      opt.textContent = lang;
      opt.className = "text-slate-900";
      select.append(opt);
    }
    select.value = this.node.attrs.language || "";
    select.addEventListener("mousedown", (e) => e.stopPropagation());
    select.addEventListener("change", () => {
      const pos = this.getPos();
      if (pos != null) {
        this.view.dispatch(this.view.state.tr.setNodeAttribute(pos, "language", select.value || null));
      }
      void this.applyLanguage(select.value);
      this.cm.focus();
    });
    bar.append(select);

    const body = document.createElement("div");
    body.className = "px-3 py-2";
    body.append(this.cm.dom);

    this.dom.append(bar, body);
    void this.applyLanguage(this.node.attrs.language || "");
  }

  private async applyLanguage(name: string) {
    const desc = name ? LanguageDescription.matchLanguageName(languages, name, true) : null;
    if (!desc) {
      this.cm.dispatch({ effects: this.langCompartment.reconfigure([]) });
      return;
    }
    try {
      const support = await desc.load();
      this.cm.dispatch({ effects: this.langCompartment.reconfigure(support) });
    } catch {
      this.cm.dispatch({ effects: this.langCompartment.reconfigure([]) });
    }
  }

  private forwardUpdate() {
    if (!this.cm.hasFocus) return;
    const pos = this.getPos();
    if (pos == null) return;
    let offset = pos + 1;
    const text = this.cm.state.doc.toString();
    const tr = this.view.state.tr;
    const start = offset;
    const end = offset + this.node.content.size;
    tr.replaceWith(start, end, text ? this.view.state.schema.text(text) : []);
    const sel = this.cm.state.selection.main;
    tr.setSelection(TextSelection.create(tr.doc, offset + sel.from, offset + sel.to));
    this.updating = true;
    this.view.dispatch(tr);
    this.updating = false;
  }

  private codeMirrorKeymap() {
    return [
      { key: "ArrowUp", run: () => this.maybeEscape("line", -1) },
      { key: "ArrowLeft", run: () => this.maybeEscape("char", -1) },
      { key: "ArrowDown", run: () => this.maybeEscape("line", 1) },
      { key: "ArrowRight", run: () => this.maybeEscape("char", 1) },
      {
        key: "Mod-Enter",
        run: () => {
          if (!exitCode(this.view.state, this.view.dispatch)) return false;
          this.view.focus();
          return true;
        },
      },
    ];
  }

  private maybeEscape(unit: "line" | "char", dir: 1 | -1): boolean {
    const state = this.cm.state;
    const main = state.selection.main;
    if (!main.empty) return false;
    let line = main.head;
    if (unit === "line") {
      const l = state.doc.lineAt(main.head);
      line = dir < 0 ? l.from : l.to;
    }
    if (dir < 0 ? line > 0 : line < state.doc.length) return false;
    const pos = this.getPos();
    if (pos == null) return false;
    const targetPos = pos + (dir < 0 ? 0 : this.node.nodeSize);
    const selection = Selection.near(this.view.state.doc.resolve(targetPos), dir);
    this.view.dispatch(this.view.state.tr.setSelection(selection).scrollIntoView());
    this.view.focus();
    return true;
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false;
    const newLang = node.attrs.language || "";
    const oldLang = this.node.attrs.language || "";
    this.node = node;
    if (this.updating) return true;
    const newText = node.textContent;
    const cur = this.cm.state.doc.toString();
    if (newText !== cur) {
      let from = 0;
      let curEnd = cur.length;
      let newEnd = newText.length;
      while (from < curEnd && from < newEnd && cur[from] === newText[from]) from++;
      while (curEnd > from && newEnd > from && cur[curEnd - 1] === newText[newEnd - 1]) {
        curEnd--;
        newEnd--;
      }
      this.updating = true;
      this.cm.dispatch({ changes: { from, to: curEnd, insert: newText.slice(from, newEnd) } });
      this.updating = false;
    }
    if (newLang !== oldLang) void this.applyLanguage(newLang);
    return true;
  }

  setSelection(anchor: number, head: number) {
    this.cm.focus();
    this.updating = true;
    this.cm.dispatch({ selection: { anchor, head } });
    this.updating = false;
  }

  selectNode() {
    this.cm.focus();
  }

  stopEvent(): boolean {
    return true;
  }

  ignoreMutation(): boolean {
    return true;
  }

  destroy() {
    this.cm.destroy();
  }
}

/** Tiptap CodeBlock with the CodeMirror editing surface. Disable StarterKit's `codeBlock` and use this. */
export const CodeMirrorBlock = CodeBlock.extend({
  addNodeView() {
    return ({ node, editor, getPos }) =>
      new CodeMirrorNodeView(node, editor.view, getPos as () => number | undefined);
  },
});
