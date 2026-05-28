/** Display host without the {@code www.} prefix; falls back to the raw URL when unparseable. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Treat any URL whose path ends in a common image extension as an inline-image card. */
export function isImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /\.(jpe?g|png|webp|gif|avif|svg)(\?.*)?$/i.test(u.pathname);
  } catch {
    return false;
  }
}

export function isSpotifyUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return h === "open.spotify.com" || h === "spotify.com";
  } catch {
    return false;
  }
}

/**
 * Extract a YouTube video ID from any of the common URL shapes (watch, youtu.be, shorts, embed).
 * Returns null for non-YouTube URLs so callers can fall back to the generic link card.
 */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host !== "youtube.com" && host !== "m.youtube.com") return null;
    const v = u.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    const shorts = u.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})/);
    if (shorts) return shorts[1];
    const embed = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})/);
    if (embed) return embed[1];
    return null;
  } catch {
    return null;
  }
}
