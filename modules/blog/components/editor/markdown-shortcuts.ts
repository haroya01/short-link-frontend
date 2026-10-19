import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection, type Transaction } from "@tiptap/pm/state";
import { findWrapping } from "@tiptap/pm/transform";
import type { MarkType, Node as PMNode, Schema } from "@tiptap/pm/model";

/**
 * Notion-style markdown shortcuts that fire even on mobile virtual keyboards.
 *
 * Tiptap/ProseMirror's built-in input rules hook `handleTextInput`, which Android/iOS IME keyboards
 * routinely bypass — text arrives via composition events instead — so on a phone typing "# " or
 * "**bold**" leaves the raw markers in the editor (they only render once the post is published and the
 * markdown is parsed). This re-checks the doc after every change via `appendTransaction`, independent of
 * how the characters were typed, and rewrites the just-completed pattern in place. On desktop the native
 * input rule has already converted the text by the time this runs, so this is a no-op there (the markers
 * are gone and nothing matches) — the two coexist without double-converting.
 */

// Block shortcuts — the marker sits at the very start of a line (a paragraph, or the line after a soft
// break) and the caret is right after the space that completes it. Capture group drives the level / list
// kind.
const BLOCK: { re: RegExp; kind: "heading" | "bullet" | "ordered" | "quote" | "task" }[] = [
  { re: /^(#{1,3}) $/, kind: "heading" },
  { re: /^(?:[-*] )?\[( |x)?\] $/i, kind: "task" },
  { re: /^([-*]) $/, kind: "bullet" },
  { re: /^(\d+)\. $/, kind: "ordered" },
  { re: /^(>) $/, kind: "quote" },
];

// A whole-paragraph divider marker → horizontal rule. Covers `---`, `***`, `___` (all CommonMark
// thematic breaks). This has to live here, not just in StarterKit's native input rule, for two
// reasons: (1) a phone IME bypasses `handleTextInput`, so `---` typed on mobile never triggered the
// native rule and serialized as an escaped `\---` PARAGRAPH (no divider in the published post); and
// (2) StarterKit's rule only matches `---`, so `***`/`___` never converted on any platform. The rule
// fires the moment the third marker char completes an otherwise-empty paragraph — no trailing space
// needed (a divider has no text after it).
const DIVIDER_RE = /^(-{3,}|\*{3,}|_{3,})$/;

// Inline marks — a "<marker>text<marker>" run whose closing marker was just typed. Ordered so the
// greedier/compound markers are tested before their single-char counterparts (code/**/~~ before *).
const INLINE: { mark: string; re: RegExp; len: number }[] = [
  { mark: "code", re: /`([^`\n]+)`$/, len: 1 },
  { mark: "bold", re: /\*\*([^*\n]+)\*\*$/, len: 2 },
  { mark: "strike", re: /~~([^~\n]+)~~$/, len: 2 },
  // Single * not preceded by another * or a word char (so it never bites into a ** pair or mid-word).
  { mark: "italic", re: /(?<![*\w])\*([^*\n]+)\*$/, len: 1 },
];

// "[text](url)" and "<url>" typed in prose become a link, as in the app's editor.
const LINK = /(?<!!)\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)$/;
const ANGLE_LINK = /<(https?:\/\/[^\s>]+)>$/;

// A quote whose first line is "[!NOTE]" (or TIP / IMPORTANT / WARNING / CAUTION) is that callout.
const CALLOUT_LINE = /^\[!(note|tip|important|warning|caution)\]$/i;

// Qiita/Zenn containers, the same forms the app and the paste path read: ":::note" … ":::".
const CONTAINER_OPEN = /^:::[ \t]*(note|message)(?:[ \t]+(info|warn|alert))?[ \t]*$/;
const CONTAINER_KIND: Record<string, string> = {
  note: "note",
  "note info": "note",
  "note warn": "warning",
  "note alert": "caution",
  message: "note",
  "message alert": "caution",
};

type Line = { text: string; from: number; to: number; paragraph: number };

function linesOf(paragraph: PMNode, start: number, index: number): Line[] {
  const lines: Line[] = [];
  let from = start;
  let text = "";
  paragraph.forEach((child, offset) => {
    if (child.type.name === "hardBreak") {
      lines.push({ text, from, to: start + offset, paragraph: index });
      from = start + offset + child.nodeSize;
      text = "";
    } else {
      text += child.textContent;
    }
  });
  lines.push({ text, from, to: start + paragraph.content.size, paragraph: index });
  return lines;
}

function containerToCallout(doc: PMNode, schema: Schema, index: number): { from: number; to: number; node: PMNode } | null {
  const blockquote = schema.nodes.blockquote;
  if (!blockquote) return null;
  const lines: Line[] = [];
  let pos = 0;
  const starts: number[] = [];
  doc.forEach((_node, offset) => starts.push(offset));
  for (let i = index; i >= 0; i--) {
    const node = doc.child(i);
    if (node.type.name !== "paragraph") break;
    lines.unshift(...linesOf(node, starts[i] + 1, i));
  }
  const close = lines[lines.length - 1];
  if (close?.text.trim() !== ":::") return null;
  for (let l = lines.length - 2; l >= 0; l--) {
    const text = lines[l].text.trim();
    if (text === ":::") return null;
    const open = text.match(CONTAINER_OPEN);
    if (!open) continue;
    const kind = CONTAINER_KIND[open[2] ? `${open[1]} ${open[2]}` : open[1]] ?? "note";
    const inner = lines.slice(l + 1, -1);
    const paragraphs: PMNode[] = [];
    let current: PMNode[] = [];
    let currentParagraph = inner[0]?.paragraph ?? -1;
    for (const line of inner) {
      if (line.paragraph !== currentParagraph && current.length > 0) {
        paragraphs.push(schema.nodes.paragraph.create(null, current));
        current = [];
      }
      currentParagraph = line.paragraph;
      const slice = doc.slice(line.from, line.to).content;
      if (current.length > 0) current.push(schema.nodes.hardBreak.create());
      slice.forEach((child) => current.push(child));
    }
    if (current.length > 0) paragraphs.push(schema.nodes.paragraph.create(null, current));
    if (paragraphs.length === 0) paragraphs.push(schema.nodes.paragraph.create());
    const opening = lines[l];
    const openingIsBlockStart = opening.from === starts[opening.paragraph] + 1;
    pos = openingIsBlockStart ? starts[opening.paragraph] : opening.from - 1;
    return { from: pos, to: starts[index] + doc.child(index).nodeSize, node: blockquote.create({ alert: kind }, paragraphs) };
  }
  return null;
}

const KEY = new PluginKey("markdownShortcuts");

export const MarkdownShortcuts = Extension.create({
  name: "markdownShortcuts",
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { empty, $from } = this.editor.state.selection;
        if (!empty || $from.parentOffset !== 0 || $from.depth !== 1) return false;
        if ($from.parent.type.name !== "heading" || $from.parent.content.size > 0) return false;
        return this.editor.commands.setParagraph();
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: KEY,
        appendTransaction: (trs, _oldState, newState) => {
          // Only react to user edits that changed text, and never to our own appended transaction.
          if (!trs.some((tr) => tr.docChanged)) return null;
          if (trs.some((tr) => tr.getMeta(KEY))) return null;

          const sel = newState.selection;
          if (!sel.empty) return null;
          const $from = sel.$from;
          const parent = $from.parent;
          if (!parent.isTextblock) return null;

          const schema = newState.schema;
          const blockStart = $from.start();
          const before = parent.textBetween(0, $from.parentOffset, "\n", "\n");

          // --- A quote whose first line is "[!NOTE]", left with Enter → that callout; the marker line goes. ---
          const quote = $from.depth >= 2 ? $from.node(-1) : null;
          const marker = quote?.firstChild?.textContent.match(CALLOUT_LINE);
          if (
            marker &&
            quote?.type.name === "blockquote" &&
            !quote.attrs.alert &&
            $from.index(-1) === 1 &&
            parent.content.size === 0
          ) {
            const quoteStart = $from.before(-1);
            const tr = newState.tr.setNodeMarkup(quoteStart, undefined, { ...quote.attrs, alert: marker[1].toLowerCase() });
            tr.delete(quoteStart + 1, quoteStart + 1 + quote.firstChild!.nodeSize);
            return tr.setMeta(KEY, true);
          }

          // --- A closing ":::" under a ":::note" (and its forms) → a callout of everything between. ---
          if (parent.type.name === "paragraph" && $from.depth === 1 && $from.parentOffset === parent.content.size) {
            const container = before.endsWith(":::") ? containerToCallout(newState.doc, schema, $from.index(0)) : null;
            if (container) {
              const tr = newState.tr.replaceWith(container.from, container.to, [
                container.node,
                schema.nodes.paragraph.create(),
              ]);
              tr.setSelection(TextSelection.create(tr.doc, container.from + container.node.nodeSize + 1));
              return tr.setMeta(KEY, true);
            }
          }

          // "- [ ] " typed GitHub-style: the "- " already made a one-item bullet list, so "[ ] " lands
          // inside it and no rule matches there. Swap that fresh list for a task list.
          const taskMarker = /^\[( |x)?\] $/i.exec(before);
          const { taskList, taskItem, paragraph } = schema.nodes;
          if (taskMarker && taskList && taskItem && $from.depth >= 3 && parent.type.name === "paragraph") {
            const item = $from.node(-1);
            const list = $from.node(-2);
            if (item.type.name === "listItem" && item.childCount === 1 && list.type.name === "bulletList" && list.childCount === 1) {
              const rest = parent.content.cut(taskMarker[0].length);
              const listPos = $from.before(-2);
              const task = taskList.create(
                null,
                taskItem.create({ checked: /x/i.test(taskMarker[1] ?? "") }, paragraph.create(null, rest)),
              );
              const tr = newState.tr.replaceWith(listPos, listPos + list.nodeSize, task);
              tr.setSelection(TextSelection.create(tr.doc, listPos + 3 + rest.size));
              return tr.setMeta(KEY, true);
            }
          }

          // --- Block: only a plain top-level paragraph promotes (lists/quotes/headings keep their own). ---
          // A single Enter is a soft break (EnterSoftBreak), so a marker typed at the start of the next
          // visual line sits mid-paragraph. Match the current line and, when it follows a soft break,
          // split the paragraph there first so the shortcut applies to that line alone.
          const lineStart = before.lastIndexOf("\n") + 1;
          const line = before.slice(lineStart);
          const afterBreak = lineStart > 0;
          const lineIsBlockStart =
            !afterBreak || newState.doc.resolve(blockStart + lineStart).nodeBefore?.type.name === "hardBreak";
          if (parent.type.name === "paragraph" && lineIsBlockStart) {
            const splitAtBreak = (tr: Transaction) => {
              const breakPos = blockStart + lineStart - 1;
              tr.delete(breakPos, breakPos + 1);
              tr.split(breakPos);
              return breakPos + 2;
            };

            // Divider — the line is just `---`/`***`/`___` with nothing after the caret. Replace that
            // paragraph with a horizontalRule so it round-trips as a DIVIDER block (the reader draws
            // the section rule).
            const horizontalRule = schema.nodes.horizontalRule;
            if (horizontalRule && DIVIDER_RE.test(line) && $from.parentOffset === parent.content.size) {
              // Swap the whole marker paragraph (its outer boundaries) for an HR, so the `---` text is
              // gone rather than left sitting above the rule.
              const tr = newState.tr;
              const lineFrom = afterBreak ? splitAtBreak(tr) : blockStart;
              const $line = tr.doc.resolve(lineFrom);
              tr.replaceRangeWith($line.before(), $line.after(), horizontalRule.create());
              return tr.setMeta(KEY, true);
            }
            const fence = line.match(/^```([\w+#.-]*) $/);
            const codeBlock = schema.nodes.codeBlock;
            if (fence && codeBlock && $from.parentOffset === parent.content.size) {
              const tr = newState.tr;
              const from = afterBreak ? splitAtBreak(tr) : blockStart;
              tr.delete(from, from + fence[0].length);
              tr.setBlockType(from, from, codeBlock, fence[1] ? { language: fence[1] } : {});
              return tr.setMeta(KEY, true);
            }
            for (const { re, kind } of BLOCK) {
              const m = line.match(re);
              if (!m) continue;
              const tr = newState.tr;
              const from = afterBreak ? splitAtBreak(tr) : blockStart;
              tr.delete(from, from + m[0].length);

              if (kind === "heading") {
                const heading = schema.nodes.heading;
                if (!heading) return null;
                tr.setBlockType(from, from, heading, { level: m[1].length });
                return tr.setMeta(KEY, true);
              }

              const wrapNode =
                kind === "quote"
                  ? schema.nodes.blockquote
                  : kind === "bullet"
                    ? schema.nodes.bulletList
                    : kind === "task"
                      ? schema.nodes.taskList
                      : schema.nodes.orderedList;
              if (!wrapNode) return null;
              const range = tr.doc.resolve(from).blockRange();
              const found = range && findWrapping(range, wrapNode);
              const wrapping =
                found && kind === "task"
                  ? found.map((w) => (w.type === schema.nodes.taskItem ? { type: w.type, attrs: { checked: /x/i.test(m[1] ?? "") } } : w))
                  : found;
              if (!range || !wrapping) return null; // can't wrap here → leave the text untouched
              tr.wrap(range, wrapping);
              return tr.setMeta(KEY, true);
            }
          }

          // --- Links: "[text](url)" → text linked to url; "<url>" → url linked to itself. ---
          const linkMark = schema.marks.link as MarkType | undefined;
          const link = linkMark && (before.match(LINK) ?? before.match(ANGLE_LINK));
          if (linkMark && link) {
            const [whole, label, href] = link.length === 3 ? link : [link[0], link[1], link[1]];
            const from = blockStart + ($from.parentOffset - whole.length);
            const tr = newState.tr.replaceWith(from, from + whole.length, schema.text(label, [linkMark.create({ href })]));
            tr.removeStoredMark(linkMark);
            return tr.setMeta(KEY, true);
          }

          // --- Inline marks: rewrite the closed run in place. ---
          for (const { mark, re, len } of INLINE) {
            const m = before.match(re);
            if (!m) continue;
            const markType = schema.marks[mark] as MarkType | undefined;
            if (!markType) continue;
            const matchFrom = blockStart + ($from.parentOffset - m[0].length);
            const innerFrom = matchFrom + len;
            const innerLen = m[1].length;
            const innerTo = innerFrom + innerLen;
            const tr = newState.tr;
            // Drop the closing marker first (higher positions stay valid), then the opening one.
            tr.delete(innerTo, innerTo + len);
            tr.delete(matchFrom, innerFrom);
            tr.addMark(matchFrom, matchFrom + innerLen, markType.create());
            // So the next keystroke (the caret now sits where the closing marker was) isn't marked.
            tr.removeStoredMark(markType);
            return tr.setMeta(KEY, true);
          }

          return null;
        },
      }),
    ];
  },
});
