import { expect, test } from "@playwright/test";
import path from "node:path";

/**
 * Mobile landing-page artifact spec.
 *
 * Boots the landing in two mobile viewports (iPhone 13 — 375x812 and iPhone 11 Pro Max — 414x896),
 * walks each major landing section (hero, previews, counters, feature carousel, why-kurl, FAQ),
 * takes a focused element screenshot of each, and writes the PNG to
 * `test-results/landing-mobile/<viewport>/<section>.png` so PR reviewers can inspect the mobile
 * layout without booting a phone.
 *
 * <p>Not a regression baseline — these are saved artifacts, not `toHaveScreenshot` snapshots, so
 * the suite never fails on small drift (font rendering, font fallback, etc.). The companion
 * {@code mobile-nav.spec.ts} keeps the horizontal-overflow guarantee.
 *
 * <p>{@code test.use({ viewport })} is set at module top — Playwright forbids per-describe
 * viewport overrides that change worker config. To capture both phones in one run we iterate the
 * viewport list inside a single test by calling {@code page.setViewportSize()} per phone.
 */

const SECTIONS: { id: string; selector: string }[] = [
  { id: "hero", selector: "section.grid-bg" },
  // Use ul.grid as the anchor — it's a stable handle for the 4 preview cards.
  { id: "previews", selector: "section:has(> div > ul.grid)" },
  { id: "counters", selector: "section:has(dl.grid-cols-2)" },
  { id: "features", selector: 'section:has-text("단순 단축이 아닙니다")' },
  { id: "why-kurl", selector: 'section:has-text("이걸 다른 데선 왜 안 줄까")' },
  { id: "faq", selector: 'section:has-text("자주 묻는 질문")' },
];

const VIEWPORTS: { name: string; width: number; height: number }[] = [
  { name: "iphone-13", width: 375, height: 812 },
  { name: "iphone-11-pro-max", width: 414, height: 896 },
];

test.describe("landing mobile artifacts", () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name} — section screenshots`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/ko", { waitUntil: "networkidle" });

      const outDir = path.join("test-results", "landing-mobile", vp.name);

      // Full-page first — one tall PNG is the most useful artifact at a glance.
      await page.screenshot({
        path: path.join(outDir, "00-full-page.png"),
        fullPage: true,
        animations: "disabled",
      });

      for (const s of SECTIONS) {
        const node = page.locator(s.selector).first();
        if ((await node.count()) === 0) continue;
        await node.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await node.screenshot({
          path: path.join(outDir, `${s.id}.png`),
          animations: "disabled",
        });
      }

      // Horizontal-overflow guarantee — fail loudly if any section caused a >2 px overflow.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(2);
    });
  }
});
