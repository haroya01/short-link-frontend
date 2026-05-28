/**
 * Frontend mirror of the backend {@code EmbedProvider} host whitelist (oembed SSRF guard). Resolving
 * on the client only drives UX — the right label / ✓ ✗ hint in the dialog — and the backend stays
 * the source of truth on save. Keep the host list in sync when the backend changes, otherwise the
 * dialog will say "unsupported" for a URL the API would actually accept (or vice versa).
 */
type ProviderSpec = {
  id: "youtube" | "vimeo" | "spotify" | "soundcloud";
  hosts: readonly string[];
  name: string;
};

const PROVIDERS: readonly ProviderSpec[] = [
  {
    id: "youtube",
    hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"],
    name: "YouTube",
  },
  {
    id: "vimeo",
    hosts: ["vimeo.com", "www.vimeo.com", "player.vimeo.com"],
    name: "Vimeo",
  },
  {
    id: "spotify",
    hosts: ["open.spotify.com"],
    name: "Spotify",
  },
  {
    id: "soundcloud",
    hosts: ["soundcloud.com", "www.soundcloud.com", "m.soundcloud.com", "on.soundcloud.com"],
    name: "SoundCloud",
  },
] as const;

export function resolveEmbedProvider(url: string): ProviderSpec | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const host = parsed.host.toLowerCase();
  for (const p of PROVIDERS) {
    if (p.hosts.includes(host)) return p;
  }
  return null;
}

export const EMBED_PROVIDERS = PROVIDERS;
