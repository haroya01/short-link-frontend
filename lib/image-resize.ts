/**
 * Client-side image downscaling. Each call site decides its own ceiling: avatars want a tight
 * 512px square, profile backgrounds want up to 2048px preserving aspect, etc. Always re-encodes
 * (default JPEG @0.9) so the upload size is bounded regardless of input — frontend's main job
 * here is "don't ship a 50MP camera shot to S3".
 *
 * Bypassed clients (someone calling the API directly) are caught by the backend's HEAD-and-reject
 * size guard; this util is the UX-side half.
 */

export type ResizeOptions = {
  /** Hard ceiling on the longer edge (or both edges if {@link square}). */
  maxDim: number;
  /** Center-crop to a square of {@code maxDim × maxDim}. Default false → preserve aspect. */
  square?: boolean;
  /** Output MIME. Default `image/jpeg`. JPEG / WebP recommended; PNG keeps alpha but balloons size. */
  type?: "image/jpeg" | "image/webp" | "image/png";
  /** 0..1 quality for lossy formats. Default 0.9. Ignored for PNG. */
  quality?: number;
  /** File name on the resulting File. Default {@code resized.<ext>}. */
  filename?: string;
};

const EXT_BY_TYPE: Record<NonNullable<ResizeOptions["type"]>, string> = {
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/png": "png",
};

/**
 * Resizes {@link file} according to {@link options}. Smaller-than-target images pass through
 * untouched in dimensions (we never upscale) but are still re-encoded so the output type is
 * predictable. The returned File can go straight into a presigned S3 PUT.
 */
export async function resizeImage(file: File, options: ResizeOptions): Promise<File> {
  const type = options.type ?? "image/jpeg";
  const quality = options.quality ?? 0.9;
  const ext = EXT_BY_TYPE[type];
  const filename = options.filename ?? `resized.${ext}`;

  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  const { dw, dh, sx, sy, sw, sh } = computeBox(
    img.width,
    img.height,
    options.maxDim,
    Boolean(options.square),
  );

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unavailable");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      type,
      quality,
    ),
  );
  return new File([blob], filename, { type });
}

/**
 * Geometry for the canvas {@code drawImage} call inside {@link resizeImage}. Exported only for
 * the unit test — production code calls {@link resizeImage} and never touches this directly.
 * The four source rect outputs ({@code sx} / {@code sy} / {@code sw} / {@code sh}) describe what
 * part of the source image to draw; the two dest dims ({@code dw} / {@code dh}) describe the
 * destination canvas size. Together they let the caller crop + downscale in one drawImage call.
 */
export function computeBox(
  iw: number,
  ih: number,
  maxDim: number,
  square: boolean,
): { dw: number; dh: number; sx: number; sy: number; sw: number; sh: number } {
  if (square) {
    const side = Math.min(iw, ih);
    const dim = Math.min(maxDim, side);
    return {
      dw: dim,
      dh: dim,
      sx: (iw - side) / 2,
      sy: (ih - side) / 2,
      sw: side,
      sh: side,
    };
  }
  // Preserve aspect, only downscale (never upscale).
  const longest = Math.max(iw, ih);
  const scale = longest > maxDim ? maxDim / longest : 1;
  return {
    dw: Math.round(iw * scale),
    dh: Math.round(ih * scale),
    sx: 0,
    sy: 0,
    sw: iw,
    sh: ih,
  };
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error("read failed"));
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = src;
  });
}
