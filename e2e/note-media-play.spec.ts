import fs from "fs";
import path from "path";
import { test, expect, type Locator, type Page } from "@playwright/test";

// Mock-on lane. @mina's note 13 carries a video from another server; it is served here as a 2-second
// VP8/Opus clip with a 440Hz tone, so unmuting has real sound to decode. @yuna's note 22 carries a kurl
// upload that is an animated GIF (two frames, 200ms each); the CDN has no w480/w1080 copies of a GIF.
const TONE = fs.readFileSync(path.join(__dirname, "fixtures/tone.webm"));
const BLINK = fs.readFileSync(path.join(__dirname, "fixtures/blink.gif"));
const GIF = "https://d82putaebkgm4.cloudfront.net/note-images/blink.gif";

type Sound = { muted: boolean; volume: number; paused: boolean; decoded: number };

const sound = (video: Locator) =>
  video.evaluate((v: HTMLVideoElement & { webkitAudioDecodedByteCount?: number }) => ({
    muted: v.muted,
    volume: v.volume,
    paused: v.paused,
    decoded: v.webkitAudioDecodedByteCount ?? -1,
  })) as Promise<Sound>;

async function expectSounding(video: Locator) {
  const before = await sound(video);
  await expect
    .poll(async () => {
      const now = await sound(video);
      return !now.muted && now.volume > 0 && !now.paused && now.decoded > before.decoded;
    })
    .toBe(true);
}

async function serveCdn(page: Page) {
  const asked: string[] = [];
  await page.route("https://d82putaebkgm4.cloudfront.net/**", (route) => {
    asked.push(route.request().url());
    return route.request().url() === GIF
      ? route.fulfill({ status: 200, contentType: "image/gif", body: BLINK })
      : route.fulfill({ status: 404 });
  });
  return asked;
}

async function expectAnimating(image: Locator) {
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(8);
  const frames = new Set<string>();
  for (let i = 0; i < 5 && frames.size < 2; i++) {
    frames.add((await image.screenshot({ animations: "allow" })).toString("base64"));
    await image.page().waitForTimeout(130);
  }
  expect(frames.size, "the GIF shows more than one frame").toBeGreaterThan(1);
}

for (const viewport of [{ width: 375, height: 740 }, { width: 1280, height: 900 }]) {
  test.describe(`at ${viewport.width}px`, () => {
    test.use({ viewport });

    test("a video plays silently, and once the reader unmutes it the sound decodes and stays on", async ({ page }) => {
      await page.route("https://files.mastodon.social/waves.mp4", (route) =>
        route.fulfill({ status: 200, contentType: "video/webm", body: TONE }),
      );
      await page.goto("/ko/blog/notes?feed=federated");
      const card = page.locator('article[data-note-id="13"]');
      const video = card.locator("video");
      await expect(video).toBeVisible({ timeout: 30_000 });
      await video.scrollIntoViewIfNeeded();
      await expect.poll(async () => (await sound(video)).paused, { timeout: 15_000 }).toBe(false);
      expect((await sound(video)).muted).toBe(true);

      await page.keyboard.press("Shift");
      await video.evaluate((v: HTMLVideoElement) => {
        v.muted = false;
        v.volume = 1;
      });
      await expectSounding(video);

      await card.getByRole("button", { name: "좋아요" }).click();
      await expectSounding(video);

      await page.setViewportSize({ width: viewport.width, height: 120 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect.poll(async () => (await sound(video)).paused).toBe(true);
      await page.setViewportSize(viewport);
      await video.scrollIntoViewIfNeeded();
      await expectSounding(video);
    });

    test("an uploaded GIF animates in the feed, on its note and in the viewer, from the original file", async ({ page }) => {
      const asked = await serveCdn(page);
      await page.goto("/ko/blog/notes");
      const card = page.locator('article[data-note-id="22"]');
      await expect(card).toBeVisible({ timeout: 30_000 });
      await card.scrollIntoViewIfNeeded();
      await expectAnimating(card.getByRole("img", { name: "번갈아 깜박이는 네모" }));

      await page.goto("/ko/p/yuna/notes/22");
      const note = page.locator('article[data-note-id="22"]').first();
      await expectAnimating(note.getByRole("img", { name: "번갈아 깜박이는 네모" }));

      await note.getByRole("img", { name: "번갈아 깜박이는 네모" }).click();
      const viewer = page.getByRole("dialog");
      await expect(viewer).toBeVisible();
      await expectAnimating(viewer.locator("img").first());

      const gifAsks = asked.filter((url) => url.includes("/note-images/blink"));
      expect(gifAsks.length).toBeGreaterThan(0);
      expect(gifAsks.filter((url) => url !== GIF)).toEqual([]);
    });
  });
}
