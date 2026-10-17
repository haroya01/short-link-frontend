import { expect, test, type Locator, type Page } from "@playwright/test";

const ORIGINAL = "https://d82putaebkgm4.cloudfront.net/note-images/1/e2e-harbor.jpg";
const W1080 = "https://d82putaebkgm4.cloudfront.net/note-images/1/e2e-harbor.w1080.jpg";
const W480 = "https://d82putaebkgm4.cloudfront.net/note-images/1/e2e-harbor.w480.jpg";
const REMOTE = "https://picsum.photos/seed/kurl-note/800/600";
const picture = (width: number, height: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#7a8ca0"/></svg>`;

type Hosts = { cdn: string[]; remote: string[] };

async function serveImages(page: Page, variant: (url: string) => number = () => 200): Promise<Hosts> {
  const seen: Hosts = { cdn: [], remote: [] };
  await page.route("https://d82putaebkgm4.cloudfront.net/**", async (route) => {
    const url = route.request().url();
    seen.cdn.push(url);
    const status = /\.w(480|1080)\./.test(url) ? variant(url) : 200;
    if (status !== 200) return route.fulfill({ status, contentType: "application/xml", body: "<Error><Code>AccessDenied</Code></Error>" });
    const [width, height] = url.includes(".w480.") ? [480, 360] : url.includes(".w1080.") ? [1080, 810] : [2400, 1800];
    return route.fulfill({ status: 200, contentType: "image/svg+xml", body: picture(width, height) });
  });
  await page.route(/picsum\.photos/, (route) => {
    seen.remote.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "image/svg+xml", body: picture(800, 600) });
  });
  return seen;
}

async function harbor(page: Page): Promise<Locator> {
  await page.goto("/ko/blog/notes");
  const photo = page.locator('article[data-note-id="20"]').getByRole("img", { name: "항구의 저녁" });
  await photo.scrollIntoViewIfNeeded({ timeout: 30_000 });
  return photo;
}

async function expectHarborBox(photo: Locator) {
  const box = await photo.boundingBox();
  expect(box!.height).toBeCloseTo(430, 0);
  expect(box!.width).toBeCloseTo(428 * (4 / 3) + 2, 0);
}

const loaded = (img: Locator) => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0);
const currentSrc = (img: Locator) => img.evaluate((el: HTMLImageElement) => el.currentSrc);

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });

  test("the feed asks our CDN for the w1080 variant and leaves a remote photo as it is", async ({ page }) => {
    const seen = await serveImages(page);
    const photo = await harbor(page);
    await expect.poll(() => loaded(photo)).toBe(true);
    expect(await currentSrc(photo)).toBe(W1080);
    await expectHarborBox(photo);
    expect(seen.cdn).toContain(W1080);
    expect(seen.cdn).not.toContain(ORIGINAL);

    await page.getByRole("img", { name: "비 오는 창밖" }).first().scrollIntoViewIfNeeded();
    await expect.poll(() => seen.remote).toContain(REMOTE);
    expect(seen.remote.every((url) => !/\.w(480|1080)\./.test(url))).toBe(true);
  });

  test("a missing variant falls back to the original without moving the page, and the photo remembers it", async ({ page }) => {
    const denied: string[] = [];
    const noise: string[] = [];
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const fromCdn = message.location().url.includes("d82putaebkgm4.cloudfront.net");
      if (fromCdn && /status of 403/.test(message.text())) denied.push(message.location().url);
      else if (fromCdn || /React|hydrat/i.test(message.text())) noise.push(message.text());
    });
    const seen = await serveImages(page, () => 403);
    const photo = await harbor(page);

    await expect.poll(() => loaded(photo)).toBe(true);
    await expect(photo).toBeVisible();
    expect(await currentSrc(photo)).toBe(ORIGINAL);
    expect(await photo.getAttribute("srcset")).toBeNull();
    await expectHarborBox(photo);
    expect(seen.cdn.filter((url) => url === W1080)).toHaveLength(1);
    expect(denied).toEqual([W1080]);
    expect(noise).toEqual([]);

    await page.getByRole("link", { name: "dohyun" }).first().click();
    await page.getByRole("link", { name: "미디어" }).click();
    const cell = page.locator('[data-media-cell="20"] img');
    await expect.poll(() => cell.evaluate((el: HTMLImageElement) => el.currentSrc), { timeout: 30_000 }).toBe(ORIGINAL);
    expect(seen.cdn.filter((url) => /\.w(480|1080)\./.test(url))).toEqual([W1080]);
  });

  test("a server-rendered photo whose variant failed before hydration still ends on the original", async ({ page }) => {
    let denied!: () => void;
    const variantDenied = new Promise<void>((resolve) => (denied = resolve));
    await page.route("**/_next/static/chunks/**", async (route) => {
      await variantDenied;
      await route.continue();
    });
    const seen = await serveImages(page, () => {
      setTimeout(denied, 300);
      return 403;
    });
    await page.goto("/ko/p/dohyun/media", { waitUntil: "commit" });
    const cell = page.locator('[data-media-cell="20"] img');
    await expect.poll(() => cell.evaluate((el: HTMLImageElement) => el.currentSrc), { timeout: 30_000 }).toBe(ORIGINAL);
    await expect.poll(() => loaded(cell)).toBe(true);
    expect(seen.cdn).toEqual([W480, ORIGINAL]);
  });

  test("the lightbox shows the original", async ({ page }) => {
    const seen = await serveImages(page);
    const photo = await harbor(page);
    await expect.poll(() => loaded(photo)).toBe(true);
    await photo.click();
    const large = page.getByRole("dialog").locator("img");
    await expect(large).toHaveAttribute("src", ORIGINAL);
    await expect.poll(() => loaded(large)).toBe(true);
    expect(seen.cdn).toContain(ORIGINAL);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });

  test("a narrow slot asks for the w480 variant", async ({ page }) => {
    const seen = await serveImages(page);
    const photo = await harbor(page);
    await expect.poll(() => loaded(photo)).toBe(true);
    expect(await currentSrc(photo)).toBe(W480);
    expect(seen.cdn).not.toContain(W1080);
    expect(seen.cdn).not.toContain(ORIGINAL);
  });
});
