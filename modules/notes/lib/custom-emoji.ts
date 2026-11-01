import type { NoteEmoji } from "@/modules/notes/api/notes";
import { splitNoteText } from "@/modules/notes/lib/note-text";

export type EmojiTextPart = { kind: "text"; value: string } | { kind: "emoji"; shortcode: string; url: string };

const SHORTCODE = /^[A-Za-z0-9_]{2,}$/;
const ZWSP = "\u200B";

function knownEmojis(emojis: readonly NoteEmoji[] | null | undefined): Map<string, string> {
  const known = new Map<string, string>();
  for (const emoji of emojis ?? []) {
    if (
      typeof emoji?.shortcode === "string" &&
      typeof emoji.url === "string" &&
      SHORTCODE.test(emoji.shortcode) &&
      emoji.url.startsWith("https://")
    ) {
      known.set(emoji.shortcode, emoji.url);
    }
  }
  return known;
}

export function splitEmoji(text: string, emojis: readonly NoteEmoji[] | null | undefined): EmojiTextPart[] {
  const known = text.includes(":") ? knownEmojis(emojis) : new Map<string, string>();
  if (known.size === 0) return text ? [{ kind: "text", value: text }] : [];
  const pattern = /:([A-Za-z0-9_]{2,})(?=:)/g;
  const parts: EmojiTextPart[] = [];
  let last = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const url = known.get(match[1]);
    if (!url) continue;
    let before = match.index;
    while (before > last && text[before - 1] === ZWSP) before--;
    let after = match.index + match[0].length + 1;
    while (text[after] === ZWSP) after++;
    if (before > last) parts.push({ kind: "text", value: text.slice(last, before) });
    parts.push({ kind: "emoji", shortcode: match[1], url });
    last = after;
    pattern.lastIndex = after;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });
  return parts;
}

export function splitNoteEmoji(text: string, emojis: readonly NoteEmoji[] | null | undefined): EmojiTextPart[] {
  if (!emojis?.length || !text.includes(":")) return text ? [{ kind: "text", value: text }] : [];
  const parts: EmojiTextPart[] = [];
  const pushText = (value: string) => {
    const previous = parts.at(-1);
    if (previous?.kind === "text") previous.value += value;
    else if (value) parts.push({ kind: "text", value });
  };
  for (const part of splitNoteText(text)) {
    if (part.kind === "text") {
      for (const piece of splitEmoji(part.value, emojis)) {
        if (piece.kind === "text") pushText(piece.value);
        else parts.push(piece);
      }
    } else {
      pushText(part.kind === "tag" ? `#${part.value}` : part.kind === "mention" ? `@${part.value}` : part.value);
    }
  }
  return parts;
}
