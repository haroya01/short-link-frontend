import { expect, test, type Locator, type Page } from "@playwright/test";
import { MY_PROFILE, mockBackend, signIn } from "./helpers/mock-backend";

async function editor(page: Page) {
  await signIn(page);
  await mockBackend(page, {
    "GET /api/v1/links/me": (route) =>
      route.fulfill({
        json: {
          items: [
            {
              shortCode: "spr1ng", shortUrl: "https://kurl.me/spr1ng", originalUrl: "https://blog.example.com/summer",
              createdAt: "2026-09-01T00:00:00Z", expiresAt: null, clickCount: 0, tags: [], clicksLast7d: [0, 0, 0, 0, 0, 0, 0],
            },
          ],
          hasMore: false,
          nextCursor: null,
        },
      }),
    "GET /api/v1/public/profiles/e2euser": (route) =>
      route.fulfill({
        json: {
          ...MY_PROFILE,
          entries: [
            {
              kind: "LINK", id: 1, shortCode: "spr1ng", shortUrl: "https://kurl.me/spr1ng",
              originalUrl: "https://blog.example.com/summer", ogTitle: null, ogImage: null, highlighted: false, content: null,
            },
          ],
          publishedPostCount: 0,
        },
      }),
  });
  await page.goto("/ko/settings/profile");
  return page.getByRole("button", { name: "추가", exact: true }).and(page.locator('[aria-haspopup="menu"]'));
}

async function expectInsideColumn(page: Page, trigger: Locator) {
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  const box = (await menu.boundingBox())!;
  const column = (await trigger.locator("xpath=../..").boundingBox())!;
  const width = page.viewportSize()!.width;
  expect(box.x).toBeGreaterThanOrEqual(Math.max(0, column.x - 1));
  expect(box.x + box.width).toBeLessThanOrEqual(Math.min(width, column.x + column.width + 1));
  const first = menu.getByRole("menuitem").first();
  await expect(first).toHaveText(/텍스트/);
  const item = (await first.boundingBox())!;
  expect(item.x).toBeGreaterThanOrEqual(0);
  expect(item.x + item.width).toBeLessThanOrEqual(width);
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`the add menu opens inside the editor column at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const trigger = await editor(page);
    await trigger.click();
    await expectInsideColumn(page, trigger);
  });
}

test("the add menu moves with the arrow keys and closes on Escape or an outside click", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = await editor(page);
  await trigger.click();
  const menu = page.getByRole("menu");
  const items = menu.getByRole("menuitem");
  await expect(items.first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect(items.last()).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(menu).toBeVisible();
  await page.getByText("공개 프로필에 보일 항목").click();
  await expect(menu).toBeHidden();
});
