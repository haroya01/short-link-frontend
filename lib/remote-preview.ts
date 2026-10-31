const MASTODON_ORIGINAL = /\/media_attachments\/files\/(?:\d+\/)+original\/[^/]+$/;

export function remotePreviewUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!MASTODON_ORIGINAL.test(parsed.pathname)) return null;
  parsed.pathname = parsed.pathname.replace(/\/original\/([^/]+)$/, "/small/$1");
  return parsed.toString();
}

export function needsSharperImage(img: HTMLImageElement, dpr: number): boolean {
  return img.naturalWidth > 0 && img.getBoundingClientRect().width * dpr > img.naturalWidth * 1.1;
}
