import { describe, expect, it } from "vitest";
import { resolveEmbedProvider, EMBED_PROVIDERS } from "./embed-providers";

describe("resolveEmbedProvider", () => {
  it("resolves YouTube variants (main, short, mobile, music)", () => {
    expect(resolveEmbedProvider("https://www.youtube.com/watch?v=abc")?.id).toBe("youtube");
    expect(resolveEmbedProvider("https://youtu.be/abc")?.id).toBe("youtube");
    expect(resolveEmbedProvider("https://m.youtube.com/watch?v=abc")?.id).toBe("youtube");
    expect(resolveEmbedProvider("https://music.youtube.com/watch?v=abc")?.id).toBe("youtube");
  });

  it("resolves Vimeo (root + player)", () => {
    expect(resolveEmbedProvider("https://vimeo.com/12345")?.id).toBe("vimeo");
    expect(resolveEmbedProvider("https://player.vimeo.com/video/12345")?.id).toBe("vimeo");
  });

  it("resolves Spotify (open subdomain only)", () => {
    expect(resolveEmbedProvider("https://open.spotify.com/track/abc")?.id).toBe("spotify");
    expect(resolveEmbedProvider("https://spotify.com/track/abc")).toBeNull();
  });

  it("resolves SoundCloud variants (root, mobile, on.soundcloud.com)", () => {
    expect(resolveEmbedProvider("https://soundcloud.com/user/track")?.id).toBe("soundcloud");
    expect(resolveEmbedProvider("https://m.soundcloud.com/user/track")?.id).toBe("soundcloud");
    expect(resolveEmbedProvider("https://on.soundcloud.com/abc")?.id).toBe("soundcloud");
  });

  it("rejects unknown hosts", () => {
    expect(resolveEmbedProvider("https://evil.example/video")).toBeNull();
    expect(resolveEmbedProvider("https://twitch.tv/me")).toBeNull();
  });

  it("rejects non-http schemes", () => {
    expect(resolveEmbedProvider("javascript:alert(1)")).toBeNull();
    expect(resolveEmbedProvider("ftp://youtube.com/abc")).toBeNull();
  });

  it("returns null for empty / malformed input (no throw)", () => {
    expect(resolveEmbedProvider("")).toBeNull();
    expect(resolveEmbedProvider("not a url")).toBeNull();
  });
});

describe("EMBED_PROVIDERS", () => {
  it("every provider has at least one host and a human-readable name", () => {
    for (const p of EMBED_PROVIDERS) {
      expect(p.hosts.length).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
    }
  });
});
