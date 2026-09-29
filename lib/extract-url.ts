function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const URL_IN_TEXT = /https?:\/\/[^\s<>"'「」()]+/i;

/**
 * The first http(s) link in pasted or shared text — share sheets and clipboards often carry a
 * sentence around the URL ("이거 봐 https://… !"). Trailing punctuation that belongs to the
 * sentence is dropped.
 */
export function extractUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (isHttpUrl(trimmed)) return trimmed;
  const match = trimmed.match(URL_IN_TEXT);
  if (!match) return null;
  const candidate = match[0].replace(/[.,!?;:]+$/, "");
  return isHttpUrl(candidate) ? candidate : null;
}
