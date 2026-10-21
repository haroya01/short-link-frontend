export type ResizeOptions = {
  maxDim: number;
  square?: boolean;
  type?: "image/jpeg" | "image/webp" | "image/png";
  quality?: number;
  filename?: string;
};

const EXT_BY_TYPE: Record<NonNullable<ResizeOptions["type"]>, string> = {
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/png": "png",
};

async function resizeImage(file: File, options: ResizeOptions): Promise<File> {
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

/** Exported only for the unit test. */
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

/**
 * Re-encoding through a canvas drops EXIF, including capture GPS. Inputs it can't re-encode pass
 * through untouched: they carry no GPS EXIF, and stripping must never block an upload.
 */
export async function stripImageMetadata(file: File, maxDim = 2400): Promise<File> {
  const type = file.type;
  if (type !== "image/jpeg" && type !== "image/png" && type !== "image/webp") return file;
  try {
    return await resizeImage(file, { maxDim, type, quality: 0.92, filename: file.name });
  } catch {
    return file;
  }
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
