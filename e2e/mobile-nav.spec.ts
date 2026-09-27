import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test.describe("mobile navigation", () => {
  test("bottom tab bar shows the four sections and moves between them", async ({ page }) => {
    await page.goto("/ko");
    const tabBar = page.locator("nav:visible").filter({ has: page.getByRole("link", { name: "QR 캠페인" }) });
    for (const name of ["단축", "QR 캠페인", "모집", "프로필"]) {
      await expect(tabBar.getByRole("link", { name, exact: true })).toBeVisible();
    }
    await tabBar.getByRole("link", { name: "모집", exact: true }).click();
    await expect(page).toHaveURL(/\/ko\/events$/);
    await tabBar.getByRole("link", { name: "단축", exact: true }).click();
    await expect(page).toHaveURL(/\/ko$/);
  });

  test("home renders without horizontal overflow on iPhone", async ({ page }) => {
    await page.goto("/ko");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
