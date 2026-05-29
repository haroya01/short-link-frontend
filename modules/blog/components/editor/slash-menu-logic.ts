/**
 * Pure logic for the slash (/) block menu, split out so it can be unit-tested without the editor
 * or React. See {@link ./slash-menu.tsx}.
 */

/**
 * Given the text of the current block up to the caret, return the slash query when the caret is in
 * a "/…" trigger (slash at the block start or right after whitespace), or null otherwise. An empty
 * string means "/" with no query yet.
 */
export function matchSlashQuery(textBeforeCaret: string): string | null {
  const m = textBeforeCaret.match(/(?:^|\s)\/([^\s/]*)$/);
  return m ? m[1] : null;
}

/** Whether an item with these keywords matches the typed query (case-insensitive substring). */
export function keywordMatch(keywords: string[], query: string): boolean {
  const q = query.toLowerCase();
  if (!q) return true;
  return keywords.some((k) => k.toLowerCase().includes(q));
}
