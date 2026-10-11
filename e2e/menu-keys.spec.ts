import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

const header = (page: Page) => page.locator("header.vt-app-header");
const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return { label: el?.getAttribute("aria-label") ?? "", row: el?.hasAttribute("data-notification-row") ?? false };
  });

test("the post ⋯ menu takes the keyboard: focus moves in, arrows walk, Esc returns to the button, Tab leaves", async ({ page }) => {
  await page.goto("/ko/p/minji/pricing-experiment-free-to-pro");
  const trigger = page.locator("article header").first().getByRole("button", { name: "글 메뉴", exact: true });
  await trigger.focus({ timeout: 30_000 });
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  const items = menu.getByRole("menuitem").filter({ visible: true });
  await expect(items.first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press("End");
  await expect(items.last()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(items.first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(items.first()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(menu).toHaveCount(0);
});

test("the bell panel takes the keyboard: arrows walk the notifications, Esc returns to the bell, leaving it closes it", async ({ page }) => {
  await page.goto("/ko/blog");
  const bell = header(page).getByRole("button", { name: /^알림/ });
  await bell.focus({ timeout: 30_000 });
  await page.keyboard.press("Enter");
  const panel = page.getByRole("dialog", { name: "알림" });
  await expect(panel).toBeFocused();
  await expect(panel.locator("[data-notification-row]").first()).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("ArrowDown");
  expect((await focused(page)).row).toBe(true);
  const first = (await focused(page)).label;
  await page.keyboard.press("ArrowDown");
  expect((await focused(page)).row).toBe(true);
  expect((await focused(page)).label).not.toBe(first);
  await page.keyboard.press("End");
  await expect(panel.getByRole("link", { name: "모든 알림 보기" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(bell).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(panel).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.press("Tab");
  await expect(panel).toHaveCount(0);
});

test("↓ from the header search walks into the live results and ↑ from the first comes back to the field", async ({ page }) => {
  await page.goto("/ko/blog");
  const field = header(page).getByRole("searchbox", { name: "검색" });
  await field.click({ timeout: 30_000 });
  await field.fill("Next");
  const panel = header(page).locator("form[role='search'] > div").last();
  await expect(panel.getByRole("link").first()).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("ArrowDown");
  await expect(panel.locator("a[href], button").first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(panel.locator("a[href], button").nth(1)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect(field).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(field).toBeFocused();
  await expect(panel.getByRole("link")).toHaveCount(0);
});

for (const path of ["/ko/blog/settings", "/ko/blog/notifications", "/ko/blog/collections", "/ko/blog/write", "/ko/blog/curation", "/ko/p/minji/pricing-experiment-free-to-pro"]) {
  test(`${path} has exactly one main landmark`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("h1, article").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("main")).toHaveCount(1);
  });
}

test("the kurl short-link switch in the link dialog is just its name, no restating line", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/ko/blog/write");
  await page.getByRole("listitem").getByRole("link", { name: /작성 중인 초안/ }).click({ timeout: 30_000 });
  const body = page.locator(".tiptap");
  await expect(body).toBeVisible({ timeout: 30_000 });
  await body.click();
  await page.evaluate(() => navigator.clipboard.writeText("https://example.com/docs"));
  await page.getByTestId("editor-toolbar").getByRole("button", { name: "링크", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "링크 넣기" });
  const row = dialog.locator("label").filter({ has: page.getByRole("switch", { name: "kurl 단축 주소로" }) });
  await expect(row).toHaveText("kurl 단축 주소로");
});
