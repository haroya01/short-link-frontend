import { expect, test } from "@playwright/test";
import path from "node:path";

/**
 * Edge-case visual coverage for {@code LandingPreviews} — specifically the {@code DomainVisual}
 * card, which is the tightest layout in the strip and the one that regressed in PR #218.
 *
 * <p>The four-card grid is responsive: mobile single-column, tablet two-column, then a
 * laptop+ four-column track that drops every card to roughly 210 px. At that narrow column,
 * the domain card's URL row ({@code go.brand.com/spring} + status dot) and the meta row
 * ({@code DNS · TXT · CNAME · verified}) are both at risk of vertical-stacking if any inline
 * token loses its {@code whitespace-nowrap}. This spec captures a tight zoom on the 4th card
 * across every grid breakpoint so reviewers can eyeball wrap regressions in a single PR
 * artifact bundle, without booting a phone or shrinking a browser by hand.
 *
 * <p>Artifacts only — no {@code toHaveScreenshot} baseline. The suite never fails on font
 * rendering drift; it fails only when the runtime height of the visual area goes past the
 * single-line budget (a hard signal that something wrapped).
 */

const VIEWPORTS: { name: string; width: number; height: number; gridCols: 1 | 2 | 4 }[] = [
  // Below sm — single column, full-bleed card. Hardest to break, easiest to read.
  { name: "320", width: 320, height: 720, gridCols: 1 },
  { name: "iphone-13", width: 375, height: 812, gridCols: 1 },
  { name: "iphone-11-pro-max", width: 414, height: 896, gridCols: 1 },
  // sm:grid-cols-2 — wider tablet card.
  { name: "640-tablet", width: 640, height: 960, gridCols: 2 },
  { name: "ipad-768", width: 768, height: 1024, gridCols: 2 },
  // lg:grid-cols-4 — laptop four-up grid. Card collapses to ~210 px; this is where the
  // earlier "DNS" pill + URL row would either truncate the URL to "go.brand…" or stack-wrap
  // the pill into D / N / S. The current layout drops the competing pill, so the URL row
  // should stay single-line even at this width.
  { name: "lg-1024", width: 1024, height: 768, gridCols: 4 },
  { name: "laptop-1280", width: 1280, height: 720, gridCols: 4 },
  { name: "desktop-1920", width: 1920, height: 1080, gridCols: 4 },
];

test.describe("landing previews — domain card edge cases", () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name} (${vp.gridCols}-col) — domain card no-wrap`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/ko?stage=off", { waitUntil: "networkidle" });

      const previews = page.locator("ul.grid").first();
      await previews.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);

      const cards = previews.locator("> li");
      await expect(cards).toHaveCount(4);

      const domainCard = cards.nth(3);
      // {@code <a>} (card) → visual wrapper div ({@code h-24 relative ...}) → DomainVisual
      // root flex-col div ({@code absolute inset-0 flex flex-col gap-2}). Its direct children
      // are the two rows we care about.
      const visualInner = domainCard.locator("a > div > div").first();

      const outDir = path.join("test-results", "landing-previews-edge", vp.name);
      await domainCard.screenshot({
        path: path.join(outDir, "previews-domain-card-zoom.png"),
        animations: "disabled",
      });

      const rows = visualInner.locator("> div");
      await expect(rows).toHaveCount(2);

      // URL row carries py-1.5 + a ~17 px mono glyph → ~30 px clean. Meta row is bare 10 px
      // mono → ~15 px clean. Any wrap doubles the line count and pushes height past these
      // budgets, which is what the test guards against.
      const URL_ROW_BUDGET = 36;
      const META_ROW_BUDGET = 22;

      const urlBox = await rows.nth(0).boundingBox();
      const metaBox = await rows.nth(1).boundingBox();
      expect(urlBox, "url row bbox").not.toBeNull();
      expect(metaBox, "meta row bbox").not.toBeNull();
      expect(urlBox!.height, `url row height @ ${vp.name}`).toBeLessThan(URL_ROW_BUDGET);
      expect(metaBox!.height, `meta row height @ ${vp.name}`).toBeLessThan(META_ROW_BUDGET);

      // Hard guard against the user-reported regression — every meta token (DNS / TXT /
      // CNAME / verified) should stay on a single line. The user's bug report showed each of
      // these vertical-stacking onto its own row, which only happens if the per-span
      // {@code whitespace-nowrap} is missing AND the row is laid out as inline-flex without
      // {@code shrink-0}. The DOMRect height of each span doubles in that failure mode.
      const metaSpans = rows.nth(1).locator("> span");
      const spanCount = await metaSpans.count();
      expect(spanCount, "meta row spans count").toBeGreaterThanOrEqual(4);
      for (let i = 0; i < spanCount; i++) {
        const box = await metaSpans.nth(i).boundingBox();
        if (!box) continue;
        // 10 px mono rendering sits at 15 px line height across our system fonts. A wrapped
        // span jumps to 30 px+, so a 20 px ceiling catches the regression with margin.
        expect(box.height, `meta span ${i} height @ ${vp.name}`).toBeLessThan(20);
      }
    });
  }
});
