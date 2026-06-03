import CodeBlock from "@tiptap/extension-code-block";
import { Selection, TextSelection } from "@tiptap/pm/state";
import { redo, undo } from "@tiptap/pm/history";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorView as PMEditorView } from "@tiptap/pm/view";
import { Compartment } from "@codemirror/state";
import {
  drawSelection,
  EditorView as CMView,
  keymap as cmKeymap,
  type ViewUpdate,
} from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import {
  defaultHighlightStyle,
  indentUnit,
  LanguageDescription,
  syntaxHighlighting,
} from "@codemirror/language";
import { languages } from "@codemirror/language-data";

/**
 * A Tiptap code-block node whose editing surface IS CodeMirror 6 — language-aware syntax highlighting
 * AND real auto-indent while typing, serialised back to a ```lang fenced block via tiptap-markdown
 * (so the markdown↔blocks round-trip is unchanged).
 *
 * ProseMirror↔CodeMirror bridge follows the canonical prosemirror-codemirror integration:
 * - `forwardUpdate` mirrors CM's *minimal* changes (not a full-block replace) AND CM's selection back
 *   into PM on every CM update, so PM always knows the cursor inside the block (Mod-Enter / toolbar
 *   commands act on the right selection).
 * - Undo is owned solely by ProseMirror: CM has no `history()`; Mod-z / redo route to PM history. This
 *   avoids the double-history corruption where a CM undo gets re-recorded as a new PM transaction.
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
  private languageSelect: HTMLSelectElement;
  private langCompartment = new Compartment();
  private updating = false;
  private langRequest = 0;

  constructor(
    public node: PMNode,
    private view: PMEditorView,
    private getPos: () => number | undefined,
  ) {
    this.cm = new CMView({
      doc: this.node.textContent,
      extensions: [
        cmKeymap.of([...this.codeMirrorKeymap(), indentWithTab, ...defaultKeymap]),
        drawSelection(),
        indentUnit.of("  "),
        CMView.lineWrapping,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        this.langCompartment.of([]),
        CMView.updateListener.of((u) => {
          if (!this.updating) this.forwardUpdate(u);
        }),
        // forwardUpdate only mirrors while CM has focus. Clicking Save (outside the editor) blurs CM,
        // and the outer onBlur serializes the doc — so commit the full CM buffer into the PM node on
        // blur, or a quick-save right after typing code would persist a stale/empty CODE block.
        CMView.domEventHandlers({
          blur: () => {
            this.commitToPM();
            return false;
          },
        }),
        cmTheme,
      ],
    });

    this.dom = document.createElement("div");
    this.dom.className =
      "cm-codeblock relative my-4 overflow-hidden rounded-xl bg-slate-900 text-slate-100";

    const bar = document.createElement("div");
    bar.className = "flex justify-end border-b border-white/10 px-2 py-1";
    this.languageSelect = document.createElement("select");
    this.languageSelect.className =
      "rounded bg-transparent px-1 py-0.5 text-[11px] text-slate-400 outline-none hover:text-slate-200";
    this.languageSelect.contentEditable = "false";
    for (const lang of LANGUAGES) {
      const opt = document.createElement("option");
      opt.value = lang === "plaintext" ? "" : lang;
      opt.textContent = lang;
      opt.className = "text-slate-900";
      this.languageSelect.append(opt);
    }
    this.languageSelect.value = this.node.attrs.language || "";
    this.languageSelect.addEventListener("mousedown", (e) => e.stopPropagation());
    this.languageSelect.addEventListener("change", () => {
      const pos = this.getPos();
      if (pos != null) {
        this.view.dispatch(
          this.view.state.tr.setNodeAttribute(pos, "language", this.languageSelect.value || null),
        );
      }
      void this.applyLanguage(this.languageSelect.value);
      this.cm.focus();
    });
    bar.append(this.languageSelect);

    const body = document.createElement("div");
    body.className = "px-3 py-2";
    body.append(this.cm.dom);

    this.dom.append(bar, body);
    void this.applyLanguage(this.node.attrs.language || "");
  }

  private async applyLanguage(name: string) {
    const req = ++this.langRequest;
    const desc = name ? LanguageDescription.matchLanguageName(languages, name, true) : null;
    if (!desc) {
      if (req === this.langRequest) this.cm.dispatch({ effects: this.langCompartment.reconfigure([]) });
      return;
    }
    try {
      const support = await desc.load();
      // Ignore a stale load that resolved after a newer language change.
      if (req === this.langRequest) {
        this.cm.dispatch({ effects: this.langCompartment.reconfigure(support) });
      }
    } catch {
      if (req === this.langRequest) this.cm.dispatch({ effects: this.langCompartment.reconfigure([]) });
    }
  }

  // Mirror CM's changes AND selection into ProseMirror (canonical prosemirror-codemirror bridge).
  // Force the entire CM buffer into the PM node — used on blur, when forwardUpdate's focus guard would
  // otherwise skip the final sync. Idempotent: replacing identical text is a no-op-shaped transaction.
  private commitToPM() {
    if (this.updating) return;
    const pos = this.getPos();
    if (pos == null) return;
    const from = pos + 1;
    const to = pos + this.node.nodeSize - 1;
    const text = this.cm.state.doc.toString();
    const tr = this.view.state.tr;
    if (text.length) {
      tr.replaceWith(from, to, this.view.state.schema.text(text));
    } else {
      tr.delete(from, to);
    }
    this.updating = true;
    this.view.dispatch(tr);
    this.updating = false;
  }

  private forwardUpdate(update: ViewUpdate) {
    if (this.updating || !this.cm.hasFocus) return;
    const pos = this.getPos();
    if (pos == null) return;
    let offset = pos + 1;
    const { main } = update.state.selection;
    const selFrom = offset + main.from;
    const selTo = offset + main.to;
    const pmSel = this.view.state.selection;
    if (update.docChanged || pmSel.from !== selFrom || pmSel.to !== selTo) {
      const tr = this.view.state.tr;
      update.changes.iterChanges((fromA, toA, _fromB, _toB, text) => {
        if (text.length) {
          tr.replaceWith(offset + fromA, offset + toA, this.view.state.schema.text(text.toString()));
        } else {
          tr.delete(offset + fromA, offset + toA);
        }
        offset += text.length - (toA - fromA);
      });
      tr.setSelection(TextSelection.create(tr.doc, selFrom, selTo));
      this.updating = true;
      this.view.dispatch(tr);
      this.updating = false;
    }
  }

  private codeMirrorKeymap() {
    const runPM = (cmd: (s: PMEditorView["state"], d: PMEditorView["dispatch"]) => boolean) => () => {
      const done = cmd(this.view.state, this.view.dispatch);
      if (done) this.view.focus();
      return done;
    };
    return [
      { key: "ArrowUp", run: () => this.maybeEscape("line", -1) },
      { key: "ArrowLeft", run: () => this.maybeEscape("char", -1) },
      { key: "ArrowDown", run: () => this.maybeEscape("line", 1) },
      { key: "ArrowRight", run: () => this.maybeEscape("char", 1) },
      { key: "Mod-z", run: runPM(undo) },
      { key: "Mod-y", run: runPM(redo) },
      { key: "Mod-Shift-z", run: runPM(redo) },
      {
        // Exit the block: insert a paragraph right after the code block and move there. Done
        // directly (not via exitCode, which gates on node.spec.code) so it always fires.
        key: "Mod-Enter",
        run: () => {
          const pos = this.getPos();
          if (pos == null) return false;
          const para = this.view.state.schema.nodes.paragraph;
          const block = para?.createAndFill();
          if (!block) return false;
          const after = pos + this.node.nodeSize;
          const tr = this.view.state.tr.insert(after, block);
          tr.setSelection(Selection.near(tr.doc.resolve(after), 1));
          this.view.dispatch(tr.scrollIntoView());
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
    if (newLang !== oldLang) {
      this.languageSelect.value = newLang;
      void this.applyLanguage(newLang);
    }
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
