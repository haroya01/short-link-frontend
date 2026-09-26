export const CALLOUT_KINDS = ["note", "tip", "important", "warning", "caution"] as const;
export type CalloutKind = (typeof CALLOUT_KINDS)[number];

const MARKER = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i;

export function parseCallout(content: string | null | undefined): { kind: CalloutKind; body: string } | null {
  if (!content) return null;
  const [first, ...rest] = content.split("\n");
  const m = first.match(MARKER);
  if (!m) return null;
  return { kind: m[1].toLowerCase() as CalloutKind, body: rest.join("\n").trim() };
}

export function calloutMarker(kind: CalloutKind): string {
  return `[!${kind.toUpperCase()}]`;
}

const LEGACY_LABEL = /^\s*\p{Extended_Pictographic}\uFE0F?\s*\*\*[^*\n]{1,12}\*\*\s*$/u;

export function isLegacyCalloutLabel(content: string | null | undefined): boolean {
  return !!content && LEGACY_LABEL.test(content);
}

export function legacyMultilineCallout(content: string): { kind: CalloutKind; body: string } | null {
  const [first, ...rest] = content.split("\n");
  if (rest.length === 0 || !LEGACY_LABEL.test(first)) return null;
  return { kind: legacyCalloutKind(first), body: rest.join("\n").trim() };
}

export function upgradeLegacyCallouts<T extends { type: string; content: string | null }>(blocks: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const next = blocks[i + 1];
    if (block.type !== "QUOTE" || !block.content) {
      out.push(block);
      continue;
    }
    if (isLegacyCalloutLabel(block.content) && next?.type === "PARAGRAPH" && next.content?.trim()) {
      out.push({ ...block, content: `${calloutMarker(legacyCalloutKind(block.content))}\n${next.content}` });
      i++;
      continue;
    }
    const multiline = legacyMultilineCallout(block.content);
    out.push(multiline ? { ...block, content: `${calloutMarker(multiline.kind)}\n${multiline.body}` } : block);
  }
  return out;
}

export function legacyCalloutKind(label: string): CalloutKind {
  if (/⚠|注意|주의|warn/i.test(label)) return "warning";
  if (/❗|‼|警告|경고|alert|caution/i.test(label)) return "caution";
  if (/💡|tip|ヒント|팁/i.test(label)) return "tip";
  return "note";
}

const CONTAINER_KIND: Record<string, CalloutKind> = {
  "note": "note",
  "note info": "note",
  "note warn": "warning",
  "note alert": "caution",
  "message": "note",
  "message alert": "caution",
};

export function convertCalloutContainers(markdown: string): string {
  if (!markdown.includes(":::")) return markdown;
  const lines = markdown.split("\n");
  const out: string[] = [];
  let fence: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const marker = trimmed.match(/^(`{3,}|~{3,})/)?.[1];
    if (marker) {
      if (fence === null) fence = marker;
      else if (marker.startsWith(fence) && trimmed === marker) fence = null;
      out.push(lines[i]);
      continue;
    }
    const open = fence === null ? trimmed.match(/^:::[ \t]*(note|message)(?:[ \t]+(info|warn|alert))?[ \t]*$/) : null;
    const close = open ? lines.findIndex((line, j) => j > i && line.trim() === ":::") : -1;
    if (!open || close < 0) {
      out.push(lines[i]);
      continue;
    }
    const kind = CONTAINER_KIND[open[2] ? `${open[1]} ${open[2]}` : open[1]] ?? "note";
    out.push(`> ${calloutMarker(kind)}`, ...lines.slice(i + 1, close).map((line) => (line.trim() === "" ? ">" : `> ${line}`)));
    i = close;
  }
  return out.join("\n");
}
