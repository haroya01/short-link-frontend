import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Accessibility regression suite for the visual fixture pages. Runs the same axe-core scan as
 * {@code e2e/a11y.spec.ts} but against the {@code /visual-fixtures/<slug>} routes — those
 * don't need backend / DB, so the test runs in the no-backend visual CI workflow alongside the
 * snapshot suite.
 *
 * <p>Why a separate file: the existing {@code a11y.spec.ts} is in the backend-dependent suite
 * (gated by the e2e workflow + SUB_TOKEN). Fixture pages give us a cheap, always-running
 * baseline for component-level a11y regressions.
 *
 * <p>Critical / serious violations fail the build; minor / moderate are surfaced but tolerated
 * — same threshold as the existing suite. {@code color-contrast} is disabled because the
 * holographic foil card sets its own dark surface with brand colors that occasionally trip the
 * heuristic; we eyeball contrast separately.
 */

const FIXTURE_SLUGS = [
  "contact-card-amethyst",
  "contact-card-rose-gold",
  "contact-card-emerald",
  "contact-card-midnight",
] as const;

test.describe("a11y: visual fixtures", () => {
  for (const slug of FIXTURE_SLUGS) {
    test(`${slug} has no critical/serious axe violations`, async ({ page }) => {
      await page.goto(`/ko/visual-fixtures/${slug}`);
      await page.getByTestId("fixture").waitFor({ state: "visible" });
      const results = await new AxeBuilder({ page })
        .disableRules(["color-contrast"])
        .analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(
        blocking,
        `axe violations on ${slug}:\n${JSON.stringify(blocking, null, 2)}`,
      ).toEqual([]);
    });
  }
});
