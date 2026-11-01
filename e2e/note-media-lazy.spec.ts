import { expect, test, type Page } from "@playwright/test";
import { mockBackend } from "./helpers/mock-backend";

test.use({ viewport: { width: 390, height: 844 } });

const NOW = "2026-10-20T09:00:00Z";
const VIDEO_AT = 17;

function note(id: number, index: number) {
  const video = index === VIDEO_AT;
  return {
    id,
    body: `사진 노트 ${index}`,
    createdAt: NOW,
    editedAt: null,
    likeCount: 0,
    likedByMe: false,
    author: { id: 7, username: "yuna", avatarUrl: null, displayName: null, remoteId: null },
    media: [
      video
        ? { url: `https://media.remote.test/${id}.mp4`, altText: null, contentType: "video/mp4", width: 1280, height: 720 }
        : { url: `https://media.remote.test/${id}.png`, altText: null, contentType: "image/png", width: 1200, height: 1600 },
    ],
    quotedPost: null,
    inReplyToId: null,
    replyCount: 0,
    repostCount: 0,
    repostedByMe: false,
    quotedNote: null,
    linkPreview: null,
    visibility: "public",
  };
}

async function serve(page: Page) {
  const requested: string[] = [];
  await page.route("https://media.remote.test/**", (route) => {
    requested.push(new URL(route.request().url()).pathname.slice(1));
  });
  await mockBackend(page, {
    "GET /api/v1/public/home": (route) =>
      route.fulfill({
        json: { items: Array.from({ length: 20 }, (_, i) => ({ kind: "note", note: note(500 + i, i) })), next: null },
      }),
  });
  return requested;
}

test("a single remote photo holds its box before it loads", async ({ page }) => {
  await serve(page);
  await page.goto("/ko/blog", { waitUntil: "domcontentloaded" });
  const first = page.locator('article[data-note-id="500"] img').first();
  await expect(first).toBeAttached({ timeout: 30_000 });
  const box = (await first.boundingBox())!;
  expect(box.height).toBeGreaterThan(300);
  expect(box.height).toBeLessThanOrEqual(430);
  expect(Math.abs(box.height - (box.width * 1600) / 1200)).toBeLessThanOrEqual(1);
});

test("photos and videos far below the first screen are not fetched until the reader nears them", async ({ page }) => {
  const requested = await serve(page);
  await page.goto("/ko/blog", { waitUntil: "domcontentloaded" });
  await expect(page.locator('article[data-note-id="500"] img').first()).toBeAttached({ timeout: 30_000 });
  await page.waitForTimeout(1500);

  const far = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLImageElement>("article[data-note-id] img")]
      .filter((img) => img.getBoundingClientRect().top > window.innerHeight + 3000)
      .map((img) => new URL(img.src).pathname.slice(1)),
  );
  expect(far.length).toBeGreaterThan(5);
  expect(requested.filter((name) => name.endsWith(".png")).length).toBeGreaterThan(0);
  expect(requested.filter((name) => far.includes(name))).toEqual([]);
  expect(requested.filter((name) => name.endsWith(".mp4"))).toEqual([]);

  const video = page.locator(`article[data-note-id="${500 + VIDEO_AT}"] video`);
  await expect(video).toHaveAttribute("preload", "none");
  await video.scrollIntoViewIfNeeded();
  await expect(video).toHaveAttribute("preload", "metadata");
  await expect.poll(() => requested.filter((name) => name.endsWith(".mp4"))).toEqual([`${500 + VIDEO_AT}.mp4`]);
});

test("the first rows' photos are fetched right away, and the first two ask for high priority", async ({ page }) => {
  await serve(page);
  await page.goto("/ko/blog", { waitUntil: "domcontentloaded" });
  const img = (id: number) => page.locator(`article[data-note-id="${id}"] button img`);
  await expect(img(500)).toBeAttached({ timeout: 30_000 });
  for (const id of [500, 501]) {
    await expect(img(id)).toHaveAttribute("loading", "eager");
    await expect(img(id)).toHaveAttribute("fetchpriority", "high");
  }
  await expect(img(502)).toHaveAttribute("loading", "eager");
  await expect(img(502)).not.toHaveAttribute("fetchpriority", /.*/);
  await expect(img(503)).toHaveAttribute("loading", "lazy");
});

test("a photo without a description is still a named button, and the ALT badge is a full-size target", async ({ page }) => {
  await page.route("https://media.remote.test/**", () => {});
  const described = { ...note(600, 0), media: [{ url: "https://media.remote.test/600.png", altText: "강가의 고양이", contentType: "image/png", width: 1200, height: 1600 }] };
  await mockBackend(page, {
    "GET /api/v1/public/home": (route) =>
      route.fulfill({ json: { items: [{ kind: "note", note: note(500, 0) }, { kind: "note", note: described }], next: null } }),
  });
  await page.goto("/ko/blog", { waitUntil: "domcontentloaded" });
  await expect(page.locator('article[data-note-id="500"]').getByRole("button", { name: "사진 크게 보기" })).toBeVisible({ timeout: 30_000 });
  const badge = page.locator('article[data-note-id="600"]').getByRole("button", { name: "사진 설명 보기" });
  const box = (await badge.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(24);
  expect(box.width).toBeGreaterThanOrEqual(24);
});

const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const MASTODON = "https://files.masto.test/media_attachments/files/117/536/041/202/441/643";

async function serveMastodonNote(page: Page, small: "ok" | "missing") {
  const requested: string[] = [];
  await page.route("https://files.masto.test/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    requested.push(path.includes("/small/") ? "small" : "original");
    if (path.includes("/small/") && small === "missing") return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ status: 200, contentType: "image/png", body: PIXEL });
  });
  const item = {
    ...note(700, 0),
    media: [{ url: `${MASTODON}/original/a.png`, altText: null, contentType: "image/png", width: 1200, height: 1600 }],
  };
  await mockBackend(page, {
    "GET /api/v1/public/home": (route) => route.fulfill({ json: { items: [{ kind: "note", note: item }], next: null } }),
  });
  return requested;
}

test("a Mastodon photo paints its small preview first, then swaps to the original once on screen", async ({ page }) => {
  const requested = await serveMastodonNote(page, "ok");
  await page.goto("/ko/blog");
  const img = page.locator('article[data-note-id="700"] button img');
  await expect(img).toHaveAttribute("src", `${MASTODON}/original/a.png`, { timeout: 30_000 });
  expect(requested[0]).toBe("small");
  expect(requested).toContain("original");
});

test("a Mastodon photo without a small preview falls back to the original", async ({ page }) => {
  const requested = await serveMastodonNote(page, "missing");
  await page.goto("/ko/blog");
  const img = page.locator('article[data-note-id="700"] button img');
  await expect(img).toHaveAttribute("src", `${MASTODON}/original/a.png`, { timeout: 30_000 });
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  expect(requested[0]).toBe("small");
});
