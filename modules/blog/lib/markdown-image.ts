/**
 * Finds the first embedded image in a post's markdown body — the publish dialog auto-applies it as a
 * draft's cover (badged, removable) and offers it as a one-tap suggestion on already-public posts.
 * Skips fenced code so an image URL written inside a code sample isn't mistaken for a real embed.
 * Matches standard `![alt](url)` embeds (the shape the editor emits for uploaded/pasted images); the
 * URL is usually kurl-hosted. No React/DOM deps so it stays unit-testable and server-safe.
 */
const IMAGE = /!\[[^\]]*\]\(\s*([^()\s]+?)\s*(?:"[^"]*")?\)/;

export function firstImageUrl(markdown: string): string | null {
  // Blank out fenced blocks (newlines preserved) so an `![](…)` inside ``` ``` doesn't count.
  const withoutFences = markdown.replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, " "));
  const m = withoutFences.match(IMAGE);
  return m ? m[1] : null;
}
