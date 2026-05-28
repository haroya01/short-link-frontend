/**
 * Pure helpers that transform a markdown source + selection into a new source + new selection.
 * Kept free of React/DOM so the editor toolbar logic is unit-testable; the page wires the result
 * back into the textarea and restores the cursor.
 */
export type Selection = { start: number; end: number };
export type EditResult = { value: string; selection: Selection };

/** Wrap the selection with `marker` on both sides (bold / italic / inline code). */
export function wrapInline(
  value: string,
  sel: Selection,
  marker: string,
  placeholder = "",
): EditResult {
  const selected = value.slice(sel.start, sel.end) || placeholder;
  const next = value.slice(0, sel.start) + marker + selected + marker + value.slice(sel.end);
  const start = sel.start + marker.length;
  return { value: next, selection: { start, end: start + selected.length } };
}

/** Prefix each selected line (heading / quote / bullet / number). */
export function prefixLines(value: string, sel: Selection, prefix: string): EditResult {
  const lineStart = value.lastIndexOf("\n", sel.start - 1) + 1;
  const lineEnd = value.indexOf("\n", sel.end);
  const end = lineEnd === -1 ? value.length : lineEnd;
  const block = value.slice(lineStart, end);
  const numbered = prefix === "1. ";
  const transformed = block
    .split("\n")
    .map((line, i) => (numbered ? `${i + 1}. ` : prefix) + line)
    .join("\n");
  const next = value.slice(0, lineStart) + transformed + value.slice(end);
  return { value: next, selection: { start: lineStart, end: lineStart + transformed.length } };
}

/** Insert a markdown link, using the selection as the link text when present. */
export function insertLink(value: string, sel: Selection): EditResult {
  const text = value.slice(sel.start, sel.end) || "text";
  const snippet = `[${text}](url)`;
  const next = value.slice(0, sel.start) + snippet + value.slice(sel.end);
  // place caret on the `url` token
  const urlStart = sel.start + text.length + 3;
  return { value: next, selection: { start: urlStart, end: urlStart + 3 } };
}

/** Insert an image markdown snippet (after upload) on its own block. */
export function insertImage(value: string, sel: Selection, url: string, alt: string): EditResult {
  const snippet = `\n\n![${alt}](${url})\n\n`;
  const next = value.slice(0, sel.start) + snippet + value.slice(sel.end);
  const caret = sel.start + snippet.length;
  return { value: next, selection: { start: caret, end: caret } };
}

/** Insert a fenced code block. */
export function insertCodeBlock(value: string, sel: Selection): EditResult {
  const selected = value.slice(sel.start, sel.end);
  const snippet = "```\n" + (selected || "code") + "\n```";
  const next = value.slice(0, sel.start) + snippet + value.slice(sel.end);
  const start = sel.start + 4;
  return { value: next, selection: { start, end: start + (selected || "code").length } };
}
