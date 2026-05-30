/**
 * Per-image width (Medium-style "wide" / full-bleed). Toast's image node only round-trips `src` and
 * `alt`, so the width is carried as a marker prefix on the alt text — the only metadata that
 * survives the WYSIWYG ↔ markdown ↔ block conversion. The marker is stripped before the block is
 * stored (so the published alt is clean) and re-attached on serialize. The editor renders wide
 * images via `img[alt^="«wide»"]` CSS; the reader uses the parsed `width`. No bracket/paren chars in
 * the marker — those would break the image markdown regex.
 */
export type ImageWidth = "wide" | "full";

const MARK: Record<ImageWidth, string> = { wide: "«wide» ", full: "«full» " };
const WIDTHS: ImageWidth[] = ["wide", "full"];

/** Split a width-marker prefix out of an image's alt text. */
export function parseImageAlt(alt: string): { width?: ImageWidth; alt: string } {
  for (const w of WIDTHS) {
    if (alt.startsWith(MARK[w])) return { width: w, alt: alt.slice(MARK[w].length) };
  }
  return { alt };
}

/** Re-attach the marker to an alt for serialization back to markdown / Toast. */
export function altWithWidth(alt: string, width?: ImageWidth): string {
  return width ? MARK[width] + alt : alt;
}
