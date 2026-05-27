/**
 * Converts provider-authored oEmbed HTML into one tightly controlled iframe. We keep the provider
 * src when it belongs to a known embed host, add the autoplay flag where supported, then rebuild
 * the iframe with a fixed safe attribute set. Scripts, inline handlers, srcdoc, and all unrelated
 * tags are dropped.
 *
 * <p>Used by {@code EmbedEntryCard} after the oembed proxy returns the provider-authored iframe
 * markup. Lives in {@code lib/} (not co-located with the React component) so the logic is
 * vitest-importable as a pure function — no React, no DOM.
 */
const ALLOWED_IFRAME_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
  "player.vimeo.com",
  "open.spotify.com",
  "w.soundcloud.com",
]);

const IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
const IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox";

export function sanitizeOembedHtml(html: string): string {
  if (typeof DOMParser === "undefined" || typeof document === "undefined") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const source = doc.querySelector("iframe");
  if (!source) return "";
  const src = source.getAttribute("src");
  if (!src) return "";

  let parsed: URL;
  try {
    parsed = new URL(src);
  } catch {
    return "";
  }
  if (parsed.protocol !== "https:" || !ALLOWED_IFRAME_HOSTS.has(parsed.host.toLowerCase())) {
    return "";
  }

  const iframe = document.createElement("iframe");
  iframe.src = injectAutoplay(parsed.toString());
  iframe.title = source.getAttribute("title") || "Embedded media";
  iframe.allowFullscreen = true;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.setAttribute("allow", IFRAME_ALLOW);
  iframe.setAttribute("sandbox", IFRAME_SANDBOX);
  return iframe.outerHTML;
}

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
  if (
    isHostOrSubdomain(host, "youtube.com") ||
    isHostOrSubdomain(host, "youtube-nocookie.com") ||
    host.toLowerCase() === "youtu.be"
  )
    return { name: "autoplay", value: "1" };
  if (isHostOrSubdomain(host, "vimeo.com")) return { name: "autoplay", value: "1" };
  if (isHostOrSubdomain(host, "soundcloud.com")) return { name: "auto_play", value: "true" };
  return null;
}

function isHostOrSubdomain(host: string, domain: string): boolean {
  const normalized = host.toLowerCase();
  return normalized === domain || normalized.endsWith(`.${domain}`);
}
