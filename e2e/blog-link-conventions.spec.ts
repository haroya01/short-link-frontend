import { test, expect, type Locator, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

const header = (page: Page) => page.locator("header.vt-app-header");

async function titleColor(row: Locator) {
  await row.page().waitForTimeout(400);
  return row.locator("h2").evaluate((el) => getComputedStyle(el).color);
}

for (const path of ["/ko/p/minji/pricing-experiment-free-to-pro", "/ko/p/minji"]) {
  test(`${path} carries the feed header: 글 · 노트 and the 글쓰기 menu`, async ({ page }) => {
    await page.goto(path);
    const nav = header(page).getByRole("navigation", { name: "블로그" });
    await expect(nav.getByRole("link", { name: "글", exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(nav.getByRole("link", { name: "노트", exact: true })).toBeVisible();
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
    await header(page).locator('[data-compose-trigger="desktop"]').click();
    await expect(page.getByRole("menu", { name: "글쓰기" }).getByRole("menuitem").first()).toHaveText("노트");
  });
}

test("a feed row opens its post from anywhere, and its author link stays the author's", async ({ page }) => {
  await page.goto("/ko/blog");
  const row = page.locator("main li[data-feed-row]").filter({ has: page.locator('a[href="/ko/p/minji"]') }).first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  const postHref = await row.locator("a:has(h2)").getAttribute("href");
  const rest = await titleColor(row);

  const author = row.locator('a[href="/ko/p/minji"]');
  await author.hover();
  expect(await titleColor(row), "hovering the author leaves the title alone").toBe(rest);

  const date = row.locator("time").first();
  const box = (await date.boundingBox())!;
  const rowBox = (await row.boundingBox())!;
  const blank = { x: box.x + box.width + 60, y: box.y + box.height / 2 };
  expect(blank.x).toBeLessThan(rowBox.x + rowBox.width - 120);
  await page.mouse.move(blank.x, blank.y);
  expect(await titleColor(row), "hovering blank space lights the title").not.toBe(rest);
  await page.mouse.click(blank.x, blank.y);
  await page.waitForURL((url) => url.pathname === postHref, { timeout: 30_000 });

  await page.goBack();
  const again = page.locator("main li[data-feed-row]").filter({ has: page.locator('a[href="/ko/p/minji"]') }).first();
  await again.locator('a[href="/ko/p/minji"]').click();
  await page.waitForURL(/\/ko\/p\/minji$/, { timeout: 30_000 });
});

test("⌘/Ctrl-click and middle-click on a note body open the note in a new tab", async ({ page, context }) => {
  await page.goto("/ko/blog/notes");
  const body = page.locator("article [data-note-body]").first();
  await expect(body).toBeVisible({ timeout: 30_000 });
  const permalink = await page.locator("article").first().locator("header a:has(time)").getAttribute("href");

  const [viaModifier] = await Promise.all([context.waitForEvent("page"), body.click({ modifiers: ["ControlOrMeta"], position: { x: 4, y: 4 } })]);
  await viaModifier.waitForURL((url) => url.pathname === permalink, { timeout: 30_000 });
  await viaModifier.close();

  const [viaMiddle] = await Promise.all([context.waitForEvent("page"), body.click({ button: "middle", position: { x: 4, y: 4 } })]);
  await viaMiddle.waitForURL((url) => url.pathname === permalink, { timeout: 30_000 });
  await viaMiddle.close();

  await expect(page).toHaveURL(/\/ko\/blog\/notes$/);
});

test("the series ←/→ are links: a modified click opens a tab, a plain click moves on", async ({ page, context }) => {
  await page.goto("/ko/p/minji/pricing-experiment-free-to-pro");
  const next = page.getByRole("link", { name: "다음 회차" });
  const prev = page.getByRole("link", { name: "이전 회차" });
  await expect(next).toHaveAttribute("href", /\/p\/[^/]+\/.+/, { timeout: 30_000 });
  await expect(prev).toHaveAttribute("href", /\/p\/[^/]+\/.+/);
  const nextHref = (await next.getAttribute("href"))!;

  const [tab] = await Promise.all([context.waitForEvent("page"), next.click({ modifiers: ["ControlOrMeta"] })]);
  await tab.waitForURL((url) => url.pathname === nextHref, { timeout: 30_000 });
  await tab.close();
  await expect(page).toHaveURL(/pricing-experiment-free-to-pro$/);

  await next.click();
  await page.waitForURL((url) => url.pathname === nextHref, { timeout: 30_000 });
  await expect(page.getByRole("link", { name: "다음 회차" })).toHaveAttribute("aria-disabled", "true", { timeout: 30_000 });
  await expect(page.getByRole("link", { name: "다음 회차" })).not.toHaveAttribute("href", /.*/);
});
