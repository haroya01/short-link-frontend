/** Length as the server counts it: code points, so an emoji is one character, not two. */
export function noteLength(text: string): number {
  return Array.from(text.trim()).length;
}

export type NoteTextPart = { kind: "text"; value: string } | { kind: "link"; value: string };

const URL_PATTERN = /https?:\/\/[^\s<]+/g;
const TRAILING_PUNCTUATION = /[.,!?:;)\]'"]+$/;

/** Splits a note body into plain text and http(s) links — the same rule the server applies when it
 *  renders the note for other servers, so a link looks the same everywhere. */
export function splitLinks(body: string): NoteTextPart[] {
  const parts: NoteTextPart[] = [];
  let last = 0;
  for (const match of body.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    const raw = match[0];
    const tail = raw.match(TRAILING_PUNCTUATION)?.[0] ?? "";
    const link = raw.slice(0, raw.length - tail.length);
    if (start > last) parts.push({ kind: "text", value: body.slice(last, start) });
    parts.push({ kind: "link", value: link });
    last = start + link.length;
  }
  if (last < body.length) parts.push({ kind: "text", value: body.slice(last) });
  return parts;
}
