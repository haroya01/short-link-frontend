import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/login", "/about", "/pricing", "/terms", "/privacy"];

test.describe("accessibility (axe-core)", () => {
  for (const path of PAGES) {
    test(`${path} has no critical/serious axe violations`, async ({ page }) => {
      await page.goto(path);
      // color-contrast runs too — the palette is token-locked now (focus ring accent-600, green
      // fills accent-700 under white labels, copy text slate-500+), so flags are real regressions.
      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(
        blocking,
        `axe violations on ${path}:\n${JSON.stringify(blocking, null, 2)}`,
      ).toEqual([]);
    });
  }
});
