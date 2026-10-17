import { describe, expect, it, vi } from "vitest";
import {
  hasImageVariants,
  imageVariantUrl,
  rememberVariantFailure,
  subscribeVariantFailures,
  VARIANT_FAILURE_TTL_MS,
  variantFailed,
  variantWidthFor,
} from "./image-variant";

const CDN = "https://d82putaebkgm4.cloudfront.net";

describe("imageVariantUrl", () => {
  it("derives w1080 and w480 for a note photo on our CDN", () => {
    expect(imageVariantUrl(`${CDN}/note-images/7/cc87a025.jpg`, 1440)).toBe(`${CDN}/note-images/7/cc87a025.w1080.jpg`);
    expect(imageVariantUrl(`${CDN}/note-images/7/cc87a025.jpg`, 360)).toBe(`${CDN}/note-images/7/cc87a025.w480.jpg`);
  });

  it("derives for post images too", () => {
    expect(imageVariantUrl(`${CDN}/post-images/3/a.jpg`, 900)).toBe(`${CDN}/post-images/3/a.w1080.jpg`);
  });

  it("splits the slot at 480 px inclusive", () => {
    expect(variantWidthFor(480)).toBe(480);
    expect(variantWidthFor(481)).toBe(1080);
    expect(variantWidthFor(0)).toBe(480);
    expect(variantWidthFor(4000)).toBe(1080);
  });

  it("writes jpg for jpeg sources and keeps png as png, ignoring case", () => {
    expect(imageVariantUrl(`${CDN}/note-images/1/a.jpeg`, 300)).toBe(`${CDN}/note-images/1/a.w480.jpg`);
    expect(imageVariantUrl(`${CDN}/note-images/1/a.JPG`, 300)).toBe(`${CDN}/note-images/1/a.w480.jpg`);
    expect(imageVariantUrl(`${CDN}/note-images/1/a.png`, 900)).toBe(`${CDN}/note-images/1/a.w1080.png`);
    expect(imageVariantUrl(`${CDN}/post-images/1/a.PNG`, 300)).toBe(`${CDN}/post-images/1/a.w480.png`);
  });

  it("leaves other hosts untouched", () => {
    const remote = "https://files.mastodon.social/note-images/1/a.jpg";
    expect(imageVariantUrl(remote, 300)).toBe(remote);
    expect(imageVariantUrl("https://picsum.photos/seed/x/800/600", 300)).toBe("https://picsum.photos/seed/x/800/600");
  });

  it("leaves prefixes outside notes and posts untouched", () => {
    for (const prefix of ["avatars", "banners", "profile-images", "event-covers"]) {
      const url = `${CDN}/${prefix}/1/a.jpg`;
      expect(imageVariantUrl(url, 300)).toBe(url);
    }
    expect(imageVariantUrl(`${CDN}/x/note-images/1/a.jpg`, 300)).toBe(`${CDN}/x/note-images/1/a.jpg`);
  });

  it("leaves gif, webp and extensionless keys untouched", () => {
    for (const name of ["a.gif", "a.webp", "a", "a.jpg.txt"]) {
      const url = `${CDN}/note-images/1/${name}`;
      expect(imageVariantUrl(url, 300)).toBe(url);
    }
  });

  it("returns a URL that already names a variant as is", () => {
    expect(imageVariantUrl(`${CDN}/note-images/1/a.w480.jpg`, 1440)).toBe(`${CDN}/note-images/1/a.w480.jpg`);
    expect(imageVariantUrl(`${CDN}/post-images/1/a.w1080.png`, 300)).toBe(`${CDN}/post-images/1/a.w1080.png`);
  });

  it("returns anything that isn't an absolute URL as is", () => {
    expect(imageVariantUrl("/note-images/1/a.jpg", 300)).toBe("/note-images/1/a.jpg");
    expect(imageVariantUrl("blob:abc", 300)).toBe("blob:abc");
    expect(imageVariantUrl("", 300)).toBe("");
  });

  it("agrees with hasImageVariants", () => {
    expect(hasImageVariants(`${CDN}/note-images/1/a.jpg`)).toBe(true);
    expect(hasImageVariants(`${CDN}/note-images/1/a.gif`)).toBe(false);
    expect(hasImageVariants(`${CDN}/note-images/1/a.w480.jpg`)).toBe(false);
  });
});

describe("variant failures", () => {
  it("are remembered per original and announced once", () => {
    const url = `${CDN}/note-images/9/remember.jpg`;
    const listener = vi.fn();
    const stop = subscribeVariantFailures(listener);
    expect(variantFailed(url)).toBe(false);
    rememberVariantFailure(url);
    rememberVariantFailure(url);
    expect(variantFailed(url)).toBe(true);
    expect(variantFailed(`${CDN}/note-images/9/other.jpg`)).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });

  it("expire after a minute, so a photo posted a moment ago gets its variant on the next draw", () => {
    vi.useFakeTimers();
    try {
      const url = `${CDN}/note-images/9/fresh.jpg`;
      const listener = vi.fn();
      const stop = subscribeVariantFailures(listener);
      rememberVariantFailure(url);
      vi.advanceTimersByTime(VARIANT_FAILURE_TTL_MS - 1);
      expect(variantFailed(url)).toBe(true);
      vi.advanceTimersByTime(1);
      expect(variantFailed(url)).toBe(false);
      rememberVariantFailure(url);
      expect(variantFailed(url)).toBe(true);
      expect(listener).toHaveBeenCalledTimes(2);
      stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it("live only in memory, so a reload asks for the variant again", async () => {
    const url = `${CDN}/note-images/9/reload.jpg`;
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    rememberVariantFailure(url);
    expect(variantFailed(url)).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
    vi.resetModules();
    const fresh = await import("./image-variant");
    expect(fresh.variantFailed(url)).toBe(false);
    setItem.mockRestore();
  });
});
