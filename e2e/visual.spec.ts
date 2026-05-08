import { expect, test } from "@playwright/test";

const PAGES = [
  { name: "home", path: "/" },
  { name: "login", path: "/login" },
  { name: "about", path: "/about" },
  { name: "pricing", path: "/pricing" },
  { name: "privacy", path: "/privacy" },
  { name: "not-found", path: "/this-path-does-not-exist-zzz" },
];

test.describe("visual regression", () => {
  for (const { name, path } of PAGES) {
    test(`${name} matches snapshot`, async ({ page }) => {
      await page.goto(path);
      // Mask anything dynamic (live counters, timestamps).
      const dynamic = page.locator("[data-dynamic],footer time,dl");
      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage: true,
        animations: "disabled",
        mask: [dynamic],
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
