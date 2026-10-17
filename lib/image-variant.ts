export const IMAGE_CDN_HOST = "d82putaebkgm4.cloudfront.net";

const VARIANT_PREFIXES = ["/note-images/", "/post-images/"];
const SOURCE_EXT = /\.(jpe?g|png)$/i;
const ALREADY_VARIANT = /\.w(480|1080)\./;

export type VariantWidth = 480 | 1080;

export function variantWidthFor(slotWidthPx: number): VariantWidth {
  return slotWidthPx <= 480 ? 480 : 1080;
}

export function hasImageVariants(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.hostname === IMAGE_CDN_HOST &&
    VARIANT_PREFIXES.some((prefix) => parsed.pathname.startsWith(prefix)) &&
    SOURCE_EXT.test(parsed.pathname) &&
    !ALREADY_VARIANT.test(parsed.pathname)
  );
}

export function imageVariantUrl(url: string, slotWidthPx: number): string {
  if (!hasImageVariants(url)) return url;
  const parsed = new URL(url);
  const width = variantWidthFor(slotWidthPx);
  parsed.pathname = parsed.pathname.replace(SOURCE_EXT, (ext) =>
    `.w${width}.${ext.toLowerCase() === ".png" ? "png" : "jpg"}`,
  );
  return parsed.toString();
}

export const VARIANT_FAILURE_TTL_MS = 60_000;

const failures = new Set<string>();
const listeners = new Set<() => void>();

export function variantFailed(url: string): boolean {
  return failures.has(url);
}

export function rememberVariantFailure(url: string): void {
  if (failures.has(url)) return;
  failures.add(url);
  setTimeout(() => failures.delete(url), VARIANT_FAILURE_TTL_MS);
  listeners.forEach((listener) => listener());
}

export function subscribeVariantFailures(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
