/** Footnotes aren't a kurl block: keep "[^1]" and "[^1]: …" as written instead of letting the markdown
 *  parser read the definition as a link reference. Lines inside code fences are left alone. */
export function literalFootnotes(markdown: string): string {
  if (!markdown.includes("[^")) return markdown;
  let fence: string | null = null;
  return markdown
    .split("\n")
    .map((line) => {
      const marker = line.trim().match(/^(`{3,}|~{3,})/)?.[1];
      if (marker) {
        if (fence === null) fence = marker;
        else if (marker.startsWith(fence) && line.trim() === marker) fence = null;
        return line;
      }
      return fence === null ? line.replace(/(?<!\\)\[\^/g, "\\[^") : line;
    })
    .join("\n");
}
