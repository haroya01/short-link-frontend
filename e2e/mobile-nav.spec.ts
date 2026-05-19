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

  test("drawer slides in and Escape closes it", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByLabel(/open menu|close menu/);
    await toggle.click();
    const drawer = page.getByRole("dialog", { name: /navigation/ });
    await expect(drawer).toBeVisible();
    // Wait for the slide-in transition to settle so getBoundingClientRect reads the resting position
    // instead of a frame mid-animation.
    await page.waitForTimeout(320);
    const settled = await drawer.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { right: rect.right, viewportWidth: window.innerWidth };
    });
    // The drawer should rest fully inside the viewport (right edge at or just past the right wall).
    expect(Math.abs(settled.right - settled.viewportWidth)).toBeLessThanOrEqual(1);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(320);
    // After dismissal the drawer translates back off-screen — its left edge should sit at or past
    // the viewport right edge.
    const closed = await drawer.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { left: rect.left, viewportWidth: window.innerWidth };
    });
    expect(closed.left).toBeGreaterThanOrEqual(closed.viewportWidth - 1);
  });

  test("home renders without horizontal overflow on iPhone", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
