import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection, type Transaction } from "@tiptap/pm/state";
import { findWrapping } from "@tiptap/pm/transform";
import type { MarkType } from "@tiptap/pm/model";

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

const KEY = new PluginKey("markdownShortcuts");

export const MarkdownShortcuts = Extension.create({
  name: "markdownShortcuts",
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
