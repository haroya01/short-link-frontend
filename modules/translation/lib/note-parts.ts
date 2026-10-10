import type { NoteTextPart } from "@/modules/notes/lib/note-text";

const EDGES = /^(\s*)([\s\S]*?)(\s*)$/;

function edges(value: string) {
  const [, lead = "", core = "", trail = ""] = value.match(EDGES) ?? [];
  return { lead, core, trail };
}

export function translatableTexts(parts: readonly NoteTextPart[]): string[] {
  return parts.flatMap((part) => {
    if (part.kind !== "text") return [];
    const { core } = edges(part.value);
    return core ? [core] : [];
  });
}

export function withTranslatedTexts(
  parts: readonly NoteTextPart[],
  translated: readonly string[],
): NoteTextPart[] | null {
  if (translated.length !== translatableTexts(parts).length) return null;
  let next = 0;
  return parts.map((part) => {
    if (part.kind !== "text") return part;
    const { lead, core, trail } = edges(part.value);
    return core ? { kind: "text", value: `${lead}${translated[next++]}${trail}` } : part;
  });
}
