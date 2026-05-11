/**
 * Inject the provider's "autoplay" query param into an iframe HTML blob so the visitor's tap on
 * our facade thumbnail starts playback immediately. Each provider uses a different param name —
 * wrong/unknown host is a silent no-op, never an error. Spotify is intentionally skipped: their
 * embed API ignores autoplay for non-Premium-logged-in viewers and shows a single big play
 * button anyway.
 *
 * <p>Used by {@code EmbedEntryCard} after the oembed proxy returns the provider-authored iframe
 * markup. Lives in {@code lib/} (not co-located with the React component) so the logic is
 * vitest-importable as a pure function — no React, no DOM.
 *
 * <p>The replacement only mutates {@code <iframe src="...">} attributes; script blocks and
 * other tags pass through untouched. Idempotent: if the relevant param is already present we
 * don't duplicate it.
 */
export function withAutoplay(html: string): string {
  return html.replace(
    /<iframe([^>]*?)\ssrc="([^"]+)"([^>]*)>/gi,
    (_match, before, src, after) => {
      const next = injectAutoplay(src);
      return `<iframe${before} src="${next}"${after}>`;
    },
  );
}

export function injectAutoplay(src: string): string {
  let host: string;
  try {
    host = new URL(src).host.toLowerCase();
  } catch {
    return src;
  }
  const param = autoplayParamFor(host);
  if (!param) return src;
  if (new RegExp(`[?&]${param.name}=`, "i").test(src)) return src;
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}${param.name}=${param.value}`;
}

export function autoplayParamFor(host: string): { name: string; value: string } | null {
  if (host.endsWith("youtube.com") || host.endsWith("youtu.be"))
    return { name: "autoplay", value: "1" };
  if (host.endsWith("vimeo.com")) return { name: "autoplay", value: "1" };
  if (host.endsWith("soundcloud.com")) return { name: "auto_play", value: "true" };
  return null;
}
