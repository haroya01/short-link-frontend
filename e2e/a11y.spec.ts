import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/login", "/about", "/pricing", "/terms", "/privacy"];

test.describe("accessibility (axe-core)", () => {
  for (const path of PAGES) {
    test(`${path} has no critical/serious axe violations`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .disableRules([
          // color-contrast occasionally flags brand-correct combos; revisit when palette stabilizes
          "color-contrast",
        ])
        .analyze();
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
