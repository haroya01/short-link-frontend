import { test, expect, type Locator, type Page } from "@playwright/test";

type Box = { x: number; y: number; width: number; height: number };

async function boxes(rows: Locator): Promise<Box[]> {
  return rows.evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left), y: r.top, width: Math.round(r.width), height: r.height };
    }),
  );
}

async function openFeed(page: Page, path = "/ko/blog") {
  await page.goto(path);
  await expect(page.locator("main li[data-connection-event]").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('main a[href="/ko/p/kazuki/kyoto-workation"]')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator('main li[data-connection-event="509"]')).toHaveCount(0, { timeout: 30_000 });
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 900, thumb: 96 },
  { name: "phone", width: 390, height: 844, thumb: 72 },
]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("every feed block is a row in one column, edge to edge, with no card chrome", async ({ page }) => {
      await openFeed(page);
      const rows = page.locator("main li[data-feed-row]");
      const all = await boxes(rows);
      expect(all.length).toBeGreaterThan(8);
      expect(new Set(all.map((b) => b.x)).size, "one left edge").toBe(1);
      expect(new Set(all.map((b) => b.width)).size, "one width").toBe(1);
      for (let i = 1; i < all.length; i++) {
        expect(Math.abs(all[i].y - (all[i - 1].y + all[i - 1].height)), `row ${i} sits right under row ${i - 1}`).toBeLessThan(2);
      }

      const connection = page.locator("main li[data-connection-event]").first();
      await expect(connection).not.toContainText("지금 엮이는 것들");
      const chrome = await rows.evaluateAll((els) =>
        els.map((el) => {
          const s = getComputedStyle(el);
          return { bg: s.backgroundColor, radius: s.borderTopLeftRadius, shadow: s.boxShadow };
        }),
      );
      for (const c of chrome) expect(c).toEqual({ bg: "rgba(0, 0, 0, 0)", radius: "0px", shadow: "none" });
    });

    test(`the thumbnail is a ${viewport.thumb}px square beside the text, never over it`, async ({ page }) => {
      await openFeed(page);
      const withThumb = page.locator("main li[data-feed-row]:has([data-row-thumb])");
      expect(await withThumb.count()).toBeGreaterThan(1);
      for (const row of await withThumb.all()) {
        const thumb = (await row.locator("[data-row-thumb]").boundingBox())!;
        const text = (await row.locator("a:has(h2)").boundingBox())!;
        expect(Math.round(thumb.width)).toBe(viewport.thumb);
        expect(Math.round(thumb.height)).toBe(viewport.thumb);
        expect(thumb.x, "thumbnail starts after the text column").toBeGreaterThanOrEqual(text.x + text.width);
      }
    });

    test("a connection row has no thumbnail and its text spans the full row", async ({ page }) => {
      await openFeed(page);
      const connection = page.locator("main li[data-connection-event]").first();
      await expect(connection.locator("[data-row-thumb]")).toHaveCount(0);
      const row = (await connection.boundingBox())!;
      const text = (await connection.locator("a:has(h2), a:has(p)").first().boundingBox())!;
      expect(Math.round(text.x)).toBe(Math.round(row.x));
      expect(Math.round(text.width)).toBe(Math.round(row.width));
    });
  });
}

test.describe("desktop details", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("on a wide column the byline follows the excerpt instead of waiting below the thumbnail", async ({ page }) => {
    await openFeed(page);
    const withThumb = page.locator("main li[data-feed-row]:has([data-row-thumb])");
    for (const row of await withThumb.all()) {
      const body = (await row.locator("a:has(h2) > :last-child").boundingBox())!;
      const byline = (await row.locator("time").first().locator("..").boundingBox())!;
      const thumb = (await row.locator("[data-row-thumb]").boundingBox())!;
      expect(byline.y - (body.y + body.height), "no dead band above the byline").toBeLessThan(12);
      expect(byline.x + byline.width, "byline stays in the text column").toBeLessThanOrEqual(thumb.x);
    }
  });

  test("tag line, byline and belonging line share one meta size", async ({ page }) => {
    await openFeed(page);
    const row = page.locator('main li[data-feed-row]:not([data-connection-event]):has(a[href*="/collections/"])').first();
    await expect(row).toBeVisible({ timeout: 30_000 });
    const size = (locator: ReturnType<typeof row.locator>) => locator.evaluate((el) => getComputedStyle(el).fontSize);
    const byline = await size(row.locator("time").first().locator(".."));
    expect(await size(row.locator("> div").first())).toBe(byline);
    expect(await size(row.locator('a[href*="/collections/"]').first())).toBe(byline);
  });

  test("a connection row opens with who connected it where, and when", async ({ page }) => {
    await openFeed(page);
    const connection = page.locator("main li[data-connection-event]").first();
    const context = connection.locator("> div").first();
    await expect(context).toContainText("엮음");
    await expect(context.locator('a[href*="/collections/"]')).toHaveCount(1);
    await expect(context.locator("time")).toHaveText(/^\d+(분|시간|일)$/);
    const contextBox = (await context.boundingBox())!;
    const bodyBox = (await connection.locator("a:has(h2), a:has(p)").first().boundingBox())!;
    expect(contextBox.y + contextBox.height).toBeLessThanOrEqual(bodyBox.y + 1);
  });

  test("hovering a row tints the title, not the row", async ({ page }) => {
    await openFeed(page);
    const row = page.locator("main li[data-feed-row]:not([data-connection-event])").first();
    const title = row.locator("h2");
    const before = await title.evaluate((el) => getComputedStyle(el).color);
    await row.hover();
    await expect.poll(() => title.evaluate((el) => getComputedStyle(el).color)).not.toBe(before);
    expect(await row.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  });

  test("the bookmark sits at the end of the byline, shows on hover and on keyboard focus", async ({ page }) => {
    await openFeed(page);
    const row = page.locator("main li[data-feed-row]:not([data-connection-event])").first();
    const bookmark = row.getByRole("button", { name: "북마크에 저장" });
    const byline = row.locator("time").first().locator("..");
    await expect(byline.getByRole("button", { name: "북마크에 저장" })).toHaveCount(1);
    const bylineBox = (await byline.boundingBox())!;
    const markBox = (await bookmark.boundingBox())!;
    expect(markBox.x + markBox.width).toBeGreaterThan(bylineBox.x + bylineBox.width - 24);

    await page.mouse.move(0, 0);
    await expect.poll(() => bookmark.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
    await row.locator("h2").hover();
    await expect.poll(() => bookmark.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    await page.mouse.move(0, 0);
    await expect.poll(() => bookmark.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
    await bookmark.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect.poll(() => bookmark.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  });

  test("a post read to the end comes back muted in the feed", async ({ page }) => {
    await openFeed(page);
    const row = page.locator('main li[data-feed-row]:has(a[href="/ko/p/minji/pricing-experiment-free-to-pro"])').first();
    await expect(row).not.toHaveAttribute("data-read", "true");
    const unread = await row.locator("h2").evaluate((el) => getComputedStyle(el).color);

    await row.locator("h2").click();
    await page.waitForURL(/pricing-experiment-free-to-pro/, { timeout: 30_000 });
    await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(3_000);
    await page.goBack();

    await expect(row).toHaveAttribute("data-read", "true", { timeout: 30_000 });
    await expect(row.locator("h2")).toContainText("읽음");
    await page.mouse.move(0, 0);
    expect(await row.locator("h2").evaluate((el) => getComputedStyle(el).color)).not.toBe(unread);
  });

  test("the subscribed series tab lists each series as a row that opens it", async ({ page }) => {
    await page.goto("/ko/blog?sort=series");
    const series = page.locator("main li[data-series-row]").first();
    await expect(series).toBeVisible({ timeout: 30_000 });
    await expect(series.locator("> div").first()).toHaveText(/^시리즈·\d+편$/);
    await expect(page.getByRole("button", { name: "다음 편" })).toHaveCount(0);
    await series.locator("h2").click();
    await page.waitForURL(/\/series\//, { timeout: 30_000 });
  });
});

test("a cover filled in from the body stays out of the row; a chosen cover is its thumbnail", async ({ page }) => {
  await openFeed(page);
  const filledIn = page.locator('main li[data-feed-row]:has(a[href="/ko/p/haruka/typescript-generics-hard"])').first();
  const chosen = page.locator('main li[data-feed-row]:has(a[href="/ko/p/dohyun/nextjs-14-app-router-blog"])').first();
  await expect(filledIn).toBeVisible();
  await expect(filledIn.locator("[data-row-thumb]")).toHaveCount(0);
  await expect(chosen.locator("[data-row-thumb]")).toHaveCount(1);
});
