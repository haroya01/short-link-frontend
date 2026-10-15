/** Length as the server counts it: code points, so an emoji is one character, not two. */
export function noteLength(text: string): number {
  return Array.from(text.trim()).length;
}

export type NoteTextPart =
  | { kind: "text"; value: string }
  | { kind: "link"; value: string }
  | { kind: "tag"; value: string }
  | { kind: "mention"; value: string };

const TOKEN_PATTERN =
  /(https?:\/\/[^\s<]+)|(?<![=/)\p{L}\p{M}\p{N}_#])#([\p{L}\p{M}\p{N}_][\p{L}\p{M}\p{N}_·・]*)|(?<![A-Za-z0-9_])@([A-Za-z0-9][A-Za-z0-9_]{2,15})(?![A-Za-z0-9_@])/gu;
const TRAILING_PUNCTUATION = /[.,!?:;)\]'"]+$/;
const TAG_TRAILING = /[·・]+$/u;
const LETTER = /\p{L}/u;
const MAX_TAG_LENGTH = 40;

function tagName(raw: string): string | null {
  const name = raw.replace(TAG_TRAILING, "");
  return name.length <= MAX_TAG_LENGTH && LETTER.test(name) ? name : null;
}

/** Splits a note body into plain text, http(s) links, #hashtags and @mentions of members — the same
 *  rules the server applies when it files a note under its tags, tells the members it names and
 *  renders it for other servers. A handle links only when the server says that member exists. */
export function splitNoteText(body: string, mentions: readonly string[] = []): NoteTextPart[] {
  const members = new Set(mentions);
  const parts: NoteTextPart[] = [];
  let last = 0;
  for (const match of body.matchAll(TOKEN_PATTERN)) {
    const start = match.index ?? 0;
    let part: NoteTextPart;
    if (match[1]) {
      const tail = match[1].match(TRAILING_PUNCTUATION)?.[0] ?? "";
      part = { kind: "link", value: match[1].slice(0, match[1].length - tail.length) };
    } else if (match[2]) {
      const name = tagName(match[2]);
      if (!name) continue;
      part = { kind: "tag", value: name };
    } else {
      const handle = match[3].toLowerCase();
      if (!members.has(handle)) continue;
      part = { kind: "mention", value: handle };
    }
    if (start > last) parts.push({ kind: "text", value: body.slice(last, start) });
    parts.push(part);
    last = start + (part.kind === "link" ? part.value.length : part.value.length + 1);
  }
  if (last < body.length) parts.push({ kind: "text", value: body.slice(last) });
  return parts;
}

/** The address a note's link card is about — the first link, the same pick the server makes. Notes
 *  with photos or a quote already carry a card and get none. */
export function previewUrl(body: string, hasMedia: boolean, hasQuote: boolean): string | null {
  if (hasMedia || hasQuote) return null;
  const first = splitNoteText(body).find((part) => part.kind === "link");
  return first && first.value.length <= 2048 ? first.value : null;
}
