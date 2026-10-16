import { expect, test, type Page } from "@playwright/test";

function kindred(page: Page) {
  return page.locator("section").filter({ has: page.getByRole("heading", { level: 2, name: "취향이 겹치는 큐레이터" }) });
}

test("the cached page names every curator, the signed-in reader included", async ({ page }) => {
  await page.route("**/_next/static/chunks/**", (route) => route.abort());
  await page.goto("/ko/p/haruka/collections");
  const section = kindred(page);
  await expect(section.getByRole("link", { name: /@jinhwa/ })).toBeVisible({ timeout: 30_000 });
  await expect(section.getByRole("link", { name: /@dohyun/ })).toBeVisible();
});

test("once the page knows who is reading, the reader drops out of their own kindred curators", async ({ page }) => {
  await page.goto("/ko/p/haruka/collections");
  const section = kindred(page);
  await expect(section.getByRole("link", { name: /@jinhwa/ })).toBeVisible({ timeout: 30_000 });
  await expect(section.getByRole("link", { name: /@dohyun/ })).toHaveCount(0);
  await expect(section.getByRole("link")).toHaveCount(1);
});
