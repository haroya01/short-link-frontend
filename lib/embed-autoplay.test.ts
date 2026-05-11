import { describe, expect, it } from "vitest";
import { autoplayParamFor, injectAutoplay, withAutoplay } from "./embed-autoplay";

describe("autoplayParamFor", () => {
  it("returns autoplay=1 for YouTube hosts (top and short)", () => {
    expect(autoplayParamFor("www.youtube.com")).toEqual({ name: "autoplay", value: "1" });
    expect(autoplayParamFor("youtu.be")).toEqual({ name: "autoplay", value: "1" });
  });

  it("returns autoplay=1 for Vimeo", () => {
    expect(autoplayParamFor("player.vimeo.com")).toEqual({ name: "autoplay", value: "1" });
  });

  it("returns auto_play=true for SoundCloud (different param name)", () => {
    expect(autoplayParamFor("w.soundcloud.com")).toEqual({
      name: "auto_play",
      value: "true",
    });
  });

  it("returns null for unknown hosts including Spotify (intentionally unsupported)", () => {
    expect(autoplayParamFor("open.spotify.com")).toBeNull();
    expect(autoplayParamFor("evil.example.com")).toBeNull();
    expect(autoplayParamFor("")).toBeNull();
  });
});

describe("injectAutoplay", () => {
  it("appends YT autoplay correctly when src already has ?param", () => {
    const out = injectAutoplay("https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed");
    expect(out).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed&autoplay=1",
    );
  });

  it("appends YT autoplay with ? when no existing query", () => {
    const out = injectAutoplay("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(out).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1");
  });

  it("is idempotent — does not duplicate an already-present param", () => {
    const out = injectAutoplay(
      "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1",
    );
    expect(out).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1");
  });

  it("returns src unchanged for unknown hosts (Spotify)", () => {
    const src = "https://open.spotify.com/embed/track/abc";
    expect(injectAutoplay(src)).toBe(src);
  });

  it("returns src unchanged for malformed URLs (no crash)", () => {
    expect(injectAutoplay("not a url")).toBe("not a url");
    expect(injectAutoplay("")).toBe("");
  });
});

describe("withAutoplay", () => {
  it("rewrites a YouTube iframe src", () => {
    const yt =
      '<iframe width="200" height="113" src="https://www.youtube.com/embed/abc?feature=oembed" frameborder="0" allowfullscreen></iframe>';
    const out = withAutoplay(yt);
    expect(out).toContain('src="https://www.youtube.com/embed/abc?feature=oembed&autoplay=1"');
  });

  it("rewrites both iframes when HTML contains multiple", () => {
    const html =
      '<iframe src="https://www.youtube.com/embed/abc"></iframe>' +
      '<iframe src="https://w.soundcloud.com/player/?url=x"></iframe>';
    const out = withAutoplay(html);
    expect(out).toContain("autoplay=1");
    expect(out).toContain("auto_play=true");
  });

  it("leaves Spotify iframes untouched", () => {
    const sp = '<iframe src="https://open.spotify.com/embed/track/abc"></iframe>';
    expect(withAutoplay(sp)).toBe(sp);
  });

  it("does not corrupt unrelated tags or attributes", () => {
    const html =
      '<script src="x.js"></script><iframe src="https://youtu.be/abc" allow="autoplay"></iframe><img src="y.png">';
    const out = withAutoplay(html);
    expect(out).toContain('<script src="x.js"></script>');
    expect(out).toContain('<img src="y.png">');
    expect(out).toContain('src="https://youtu.be/abc?autoplay=1"');
    expect(out).toContain('allow="autoplay"');
  });
});
