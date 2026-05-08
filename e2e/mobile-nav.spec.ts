import { devices, expect, test } from "@playwright/test";

test.use({ ...devices["iPhone 14"] });

test.describe("mobile navigation", () => {
  test("hamburger toggle opens menu", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByLabel(/open menu|close menu/);
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole("link", { name: "단축" })).toBeVisible();
  });

  test("home renders without horizontal overflow on iPhone", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
