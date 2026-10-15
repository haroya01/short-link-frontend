/** A "@name" being typed right before the caret: where it starts and what has been typed after "@". */
export interface MentionToken {
  start: number;
  query: string;
}

const TOKEN = /(?:^|[\s([{"'“‘])@([\p{L}\p{N}_]{0,30})$/u;

export function mentionTokenAt(text: string, caret: number): MentionToken | null {
  const before = text.slice(0, caret);
  const match = before.match(TOKEN);
  if (!match || match.index == null) return null;
  const query = match[1];
  return { start: caret - query.length - 1, query };
}

/** Replace the token with "@username " and say where the caret lands. */
export function applyMention(text: string, token: MentionToken, caret: number, username: string) {
  const inserted = `@${username} `;
  const after = text.slice(caret).replace(/^\s/, "");
  return { text: text.slice(0, token.start) + inserted + after, caret: token.start + inserted.length };
}
