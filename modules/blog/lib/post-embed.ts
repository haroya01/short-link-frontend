/**
 * Resolves a post EMBED block's stored content into a render plan the public reader can draw
 * server-side. The block content is JSON `{provider, url, html}` (see the backend PostBlock
 * contract), but we never trust the stored `html` — we re-derive a clean iframe `src` from the
 * canonical `url` for the providers we know how to frame (YouTube / Vimeo), and fall back to a
 * styled link card for everything else. Pure (no DOM), so the server component can call it
 * directly and vitest can cover the URL parsing.
 */
export type EmbedPlan =
  | { kind: "video"; src: string; aspect: "16/9" }
  | { kind: "map"; lat: number; lng: number; label: string | null; url: string }
  | { kind: "link"; url: string };

export function planEmbed(raw: string | null): EmbedPlan | null {
  const url = extractUrl(raw);
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const host = parsed.host.toLowerCase();

  const youtubeId = youTubeVideoId(parsed, host);
  if (youtubeId) {
    return { kind: "video", src: `https://www.youtube-nocookie.com/embed/${youtubeId}`, aspect: "16/9" };
  }

  const vimeoId = vimeoVideoId(parsed, host);
  if (vimeoId) {
    return { kind: "video", src: `https://player.vimeo.com/video/${vimeoId}`, aspect: "16/9" };
  }

  const map = googleMapPlace(parsed, host);
  if (map) return map;

  return { kind: "link", url: parsed.toString() };
}

/**
 * A Google Maps "place" URL the editor inserts: `…/maps/place/<name>/@<lat>,<lng>,<zoom>z`. We pull
 * the coordinates from the `@lat,lng` token and the place label from the path segment, so the
 * reader can draw a static-map card. Only google.* hosts with `/maps/` qualify; other map links
 * fall through to a plain link card.
 */
function googleMapPlace(parsed: URL, host: string): EmbedPlan | null {
  const isGoogle = host === "google.com" || host.endsWith(".google.com") || /(^|\.)google\./.test(host);
  if (!isGoogle || !parsed.pathname.includes("/maps")) return null;
  const at = parsed.href.match(/@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  if (!at) return null;
  const lat = Number(at[1]);
  const lng = Number(at[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }
  const segments = parsed.pathname.split("/").filter(Boolean);
  const placeIdx = segments.indexOf("place");
  let label: string | null = null;
  if (placeIdx >= 0 && segments[placeIdx + 1] && !segments[placeIdx + 1].startsWith("@")) {
    try {
      label = decodeURIComponent(segments[placeIdx + 1].replace(/\+/g, " ")).trim() || null;
    } catch {
      label = null;
    }
  }
  return { kind: "map", lat, lng, label, url: parsed.toString() };
}

function extractUrl(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && typeof parsed.url === "string") {
      return parsed.url.trim() || null;
    }
  } catch {
    // not JSON — treat the raw payload as the URL itself
  }
  return trimmed;
}

function isHostOrSubdomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

const ID_RE = /^[\w-]{6,20}$/;

function youTubeVideoId(parsed: URL, host: string): string | null {
  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0];
    return ID_RE.test(id) ? id : null;
  }
  if (!isHostOrSubdomain(host, "youtube.com") && !isHostOrSubdomain(host, "youtube-nocookie.com")) {
    return null;
  }
  const v = parsed.searchParams.get("v");
  if (v && ID_RE.test(v)) return v;
  const segments = parsed.pathname.split("/").filter(Boolean);
  // /embed/{id}, /shorts/{id}, /live/{id}
  if (["embed", "shorts", "live"].includes(segments[0]) && segments[1]) {
    return ID_RE.test(segments[1]) ? segments[1] : null;
  }
  return null;
}

function vimeoVideoId(parsed: URL, host: string): string | null {
  if (!isHostOrSubdomain(host, "vimeo.com")) return null;
  const segments = parsed.pathname.split("/").filter(Boolean);
  // player.vimeo.com/video/{id} or vimeo.com/{id}
  const candidate = segments[0] === "video" ? segments[1] : segments[0];
  return candidate && /^\d{5,}$/.test(candidate) ? candidate : null;
}
