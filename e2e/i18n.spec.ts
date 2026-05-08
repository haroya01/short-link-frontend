import { expect, test } from "@playwright/test";

test.describe("i18n locale switch", () => {
  test("ko/en/ja paths render appropriate hero text", async ({ page }) => {
    await page.goto("/ko");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/긴 URL|클릭/);

    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Long URLs|short line/);

    await page.goto("/ja");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/長いURL|クリック/);
  });

  test("hreflang alternates present in head", async ({ page }) => {
    await page.goto("/ko");
    await expect(
      page.locator('link[rel="alternate"][hreflang="en"]'),
    ).toHaveAttribute("href", /\/en$/);
    await expect(
      page.locator('link[rel="alternate"][hreflang="ja"]'),
    ).toHaveAttribute("href", /\/ja$/);
  });
});
