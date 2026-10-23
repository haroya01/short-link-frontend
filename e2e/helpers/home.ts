import { expect, type Page } from "@playwright/test";

export async function openHome(page: Page, path = "/ko/blog") {
  await page.goto(path);
  await expect(page.locator("[data-home-seen]").first()).toBeAttached({ timeout: 30_000 });
}
