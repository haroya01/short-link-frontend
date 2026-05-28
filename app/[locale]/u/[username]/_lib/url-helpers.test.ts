import { describe, expect, it } from "vitest";
import { hostOf, isImageUrl, isSpotifyUrl, youtubeId } from "./url-helpers";

describe("hostOf", () => {
  it("returns the hostname for a valid URL", () => {
    expect(hostOf("https://example.com/path?q=1")).toBe("example.com");
  });

  it("strips a leading www.", () => {
    expect(hostOf("https://www.example.com/")).toBe("example.com");
    expect(hostOf("https://www.naver.com")).toBe("naver.com");
  });

  it("does not strip mid-string 'www.'", () => {
    expect(hostOf("https://api.www.example.com/")).toBe("api.www.example.com");
  });

  it("falls back to the raw input on malformed URLs — caller still has something to render", () => {
    expect(hostOf("not a url")).toBe("not a url");
    expect(hostOf("")).toBe("");
  });
});

describe("isImageUrl", () => {
  it("detects common image extensions", () => {
    expect(isImageUrl("https://cdn.example/photo.jpg")).toBe(true);
    expect(isImageUrl("https://cdn.example/photo.jpeg")).toBe(true);
    expect(isImageUrl("https://cdn.example/photo.png")).toBe(true);
    expect(isImageUrl("https://cdn.example/photo.webp")).toBe(true);
    expect(isImageUrl("https://cdn.example/photo.gif")).toBe(true);
    expect(isImageUrl("https://cdn.example/photo.avif")).toBe(true);
    expect(isImageUrl("https://cdn.example/icon.svg")).toBe(true);
  });

  it("case-insensitive on the extension", () => {
    expect(isImageUrl("https://cdn.example/photo.JPG")).toBe(true);
    expect(isImageUrl("https://cdn.example/photo.PNG")).toBe(true);
  });

  it("ignores query strings after the extension", () => {
    expect(isImageUrl("https://cdn.example/photo.jpg?v=2&x=y")).toBe(true);
  });

  it("returns false when there's no recognized extension", () => {
    expect(isImageUrl("https://example.com/page")).toBe(false);
    expect(isImageUrl("https://example.com/photo.bmp")).toBe(false);
    expect(isImageUrl("https://example.com/file.pdf")).toBe(false);
  });

  it("returns false on malformed input", () => {
    expect(isImageUrl("not a url")).toBe(false);
    expect(isImageUrl("")).toBe(false);
  });
});

describe("isSpotifyUrl", () => {
  it("recognizes open.spotify.com + spotify.com", () => {
    expect(isSpotifyUrl("https://open.spotify.com/track/abc")).toBe(true);
    expect(isSpotifyUrl("https://spotify.com/album/xyz")).toBe(true);
    expect(isSpotifyUrl("https://www.spotify.com/")).toBe(true);
  });

  it("rejects look-alikes", () => {
    expect(isSpotifyUrl("https://spotify.com.evil.example/")).toBe(false);
    expect(isSpotifyUrl("https://notspotify.com/")).toBe(false);
    expect(isSpotifyUrl("https://example.com/spotify.com")).toBe(false);
  });

  it("returns false on malformed input", () => {
    expect(isSpotifyUrl("")).toBe(false);
    expect(isSpotifyUrl("spotify")).toBe(false);
  });
});

describe("youtubeId", () => {
  it("extracts id from watch?v= URLs", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtube.com/watch?v=dQw4w9WgXcQ&list=PL")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts id from youtu.be short URLs", () => {
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ?t=15")).toBe("dQw4w9WgXcQ");
  });

  it("extracts id from /shorts/ + /embed/ paths", () => {
    expect(youtubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtube.com/embed/dQw4w9WgXcQ?rel=0")).toBe("dQw4w9WgXcQ");
  });

  it("returns null when the id doesn't match the 11-char YouTube ID regex", () => {
    // Too short
    expect(youtubeId("https://youtu.be/short")).toBeNull();
    // Too long
    expect(youtubeId("https://youtu.be/aaaaaaaaaaaaaaaa")).toBeNull();
    // Invalid char (slash splits but `~` is illegal)
    expect(youtubeId("https://www.youtube.com/watch?v=invalid~~~~")).toBeNull();
  });

  it("returns null for non-YouTube hosts", () => {
    expect(youtubeId("https://vimeo.com/123456")).toBeNull();
    expect(youtubeId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });

  it("returns null on malformed input", () => {
    expect(youtubeId("")).toBeNull();
    expect(youtubeId("not a url")).toBeNull();
  });
});
