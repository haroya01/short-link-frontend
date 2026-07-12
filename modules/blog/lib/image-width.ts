/**
 * Per-image width (Medium-style "wide" / full-bleed) + intrinsic dimensions (for CLS-free layout).
 * Toast's image node only round-trips `src` and `alt`, so both ride as marker prefixes on the alt
 * text — the only metadata that survives the WYSIWYG ↔ markdown ↔ block conversion. Markers are
 * stripped before the block is stored (so the published alt is clean) and re-attached on serialize.
 * The editor renders wide images via `img[alt^="«wide»"]` CSS, so the WIDTH marker must stay FIRST;
 * the dimensions marker (`«1200x800»`) follows it. The reader uses the parsed width + dims. No
 * bracket/paren chars in either marker — those would break the image markdown regex.
 */
// "wide" / "full" = wider than the column. "half" = column-half, so two consecutive halves render
// side by side (a 2-up image row), stacking on mobile.
export type ImageWidth = "wide" | "full" | "half";

/** Intrinsic pixel size of the source image, used to reserve layout space (aspect-ratio) up front. */
export type ImageDims = { w: number; h: number };

const MARK: Record<ImageWidth, string> = { wide: "«wide» ", full: "«full» ", half: "«half» " };
const WIDTHS: ImageWidth[] = ["wide", "full", "half"];
// A dimensions marker, e.g. "«1200x800» " — digits + a literal "x", guillemets only (no bracket/paren).
const DIMS_RE = /^«(\d+)x(\d+)»\s/;

/** Split width- and dimension-marker prefixes out of an image's alt text. */
export function parseImageAlt(alt: string): { width?: ImageWidth; dims?: ImageDims; alt: string } {
  let rest = alt;
  let width: ImageWidth | undefined;
  for (const w of WIDTHS) {
    if (rest.startsWith(MARK[w])) {
      width = w;
      rest = rest.slice(MARK[w].length);
      break;
    }
  }
  let dims: ImageDims | undefined;
  const dm = rest.match(DIMS_RE);
  if (dm) {
    dims = { w: Number(dm[1]), h: Number(dm[2]) };
    rest = rest.slice(dm[0].length);
  }
  return { ...(width ? { width } : {}), ...(dims ? { dims } : {}), alt: rest };
}

/** Re-attach the width + dimension markers to an alt for serialization back to markdown / Toast. */
export function altWithWidth(alt: string, width?: ImageWidth, dims?: ImageDims): string {
  const dimsMark = dims && dims.w > 0 && dims.h > 0 ? `«${dims.w}x${dims.h}» ` : "";
  return (width ? MARK[width] : "") + dimsMark + alt;
}

/**
 * Decode an image File client-side to read its intrinsic pixel size, so the reader can reserve the
 * exact aspect-ratio box and never shift layout as the image streams in. Returns null on any decode
 * failure (unsupported type, corrupt bytes) — the caller then just omits dims (graceful degrade).
 */
export async function imageNaturalSize(file: File): Promise<ImageDims | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      const dims = { w: bmp.width, h: bmp.height };
      bmp.close?.();
      if (dims.w > 0 && dims.h > 0) return dims;
    } catch {
      // fall through to the <img> decode path below
    }
  }
  if (typeof URL === "undefined" || typeof Image === "undefined") return null;
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<ImageDims | null>((resolve) => {
      const img = new Image();
      img.onload = () =>
        resolve(img.naturalWidth > 0 && img.naturalHeight > 0 ? { w: img.naturalWidth, h: img.naturalHeight } : null);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
