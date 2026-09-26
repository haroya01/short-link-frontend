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
  return markdown.replace(
    /^:::[ \t]*(note|message)(?:[ \t]+(info|warn|alert))?[ \t]*\n([\s\S]*?)\n:::[ \t]*$/gm,
    (_all, type: string, variant: string | undefined, body: string) => {
      const kind = CONTAINER_KIND[variant ? `${type} ${variant}` : type] ?? "note";
      const lines = body.split("\n").map((line) => (line.trim() === "" ? ">" : `> ${line}`));
      return [`> ${calloutMarker(kind)}`, ...lines].join("\n");
    },
  );
}
