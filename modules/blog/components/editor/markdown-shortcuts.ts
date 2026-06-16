import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
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

// Block shortcuts — the marker sits at the very start of a paragraph and the caret is right after the
// space that completes it. Capture group drives the level / list kind.
const BLOCK: { re: RegExp; kind: "heading" | "bullet" | "ordered" | "quote" }[] = [
  { re: /^(#{1,3}) $/, kind: "heading" },
  { re: /^([-*]) $/, kind: "bullet" },
  { re: /^(\d+)\. $/, kind: "ordered" },
  { re: /^(>) $/, kind: "quote" },
];

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

          // --- Block: only a plain top-level paragraph promotes (lists/quotes/headings keep their own). ---
          if (parent.type.name === "paragraph") {
            for (const { re, kind } of BLOCK) {
              const m = before.match(re);
              if (!m) continue;
              const tr = newState.tr;
              const from = blockStart;
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
                    : schema.nodes.orderedList;
              if (!wrapNode) return null;
              const range = tr.doc.resolve(from).blockRange();
              const wrapping = range && findWrapping(range, wrapNode);
              if (!wrapping) return null; // can't wrap here → leave the text untouched
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
