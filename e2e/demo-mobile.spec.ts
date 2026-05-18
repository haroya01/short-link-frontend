import { expect, test } from "@playwright/test";
import path from "node:path";

/**
 * /demo page screenshot artifact spec.
 *
 * Boots the demo page across four viewports (iPhone 13, iPhone 11 Pro Max, laptop, desktop),
 * walks each major section (hero, engagement KPIs, daily chart, audience heatmap+breakdown,
 * country, viral share cards, profile silhouette, footer CTA), takes a focused element
 * screenshot of each, and writes the PNG to `test-results/demo/<viewport>/<section>.png` so PR
 * reviewers can inspect the full demo without booting the dashboard.
 *
 * <p>The horizontal-overflow guard plus a small set of structural assertions (heatmap renders
 * accent cells, group eyebrows show the 1/4 … 4/4 step labels) are the only hard checks —
 * everything else is saved as a PNG artifact so visual drift never flakes the suite.
 */

const SECTIONS: { id: string; selector: string }[] = [
  { id: "hero", selector: 'section:has-text("라이브 데모")' },
  { id: "engagement-daily", selector: '#section-daily, section:has-text("일자별 클릭")' },
  { id: "audience-heatmap", selector: 'section:has-text("요일·시간 히트맵")' },
  { id: "audience-country", selector: 'section:has-text("국가별 분포")' },
  { id: "reach-viral", selector: 'section:has-text("공유 카드 · 라이브 클릭")' },
  { id: "showcase-profile", selector: 'section:has-text("공개 프로필 페이지")' },
  { id: "footer-cta", selector: 'section:has-text("데이터는 시범용")' },
];

const VIEWPORTS: { name: string; width: number; height: number }[] = [
  { name: "iphone-13", width: 375, height: 812 },
  { name: "iphone-11-pro-max", width: 414, height: 896 },
  { name: "laptop", width: 1280, height: 720 },
  { name: "desktop", width: 1920, height: 1080 },
];

test.describe("demo page artifacts", () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name} — /demo section screenshots`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/ko/demo", { waitUntil: "networkidle" });

      const outDir = path.join("test-results", "demo", vp.name);

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

      // Horizontal-overflow guarantee — fail loudly if any new section blew the layout.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(2);
    });
  }

  /**
   * Structural assertions — these catch the exact "히트맵 비어있다" and "국가별 분포가 다르게
   *뜬다" regressions reported on Vercel preview. Visual drift stays in the artifact PNGs above;
   * these tests fail loudly when the chart machinery is wired up wrong.
   */
  test("heatmap renders accent cells (not all empty)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ko/demo", { waitUntil: "networkidle" });
    const heatmapSection = page.locator('section:has-text("요일·시간 히트맵")').first();
    await heatmapSection.scrollIntoViewIfNeeded();
    // The Heatmap renders 7×24 = 168 button cells. If the dayOfWeek labels in the synthetic
    // data drift away from the {@code java.time.DayOfWeek} enum names the renderer expects,
    // every grid cell falls back to count=0 → bg-slate-50 → the chart looks empty. Asserting
    // that at least a quarter of the cells got an accent class catches that regression.
    const cells = heatmapSection.locator("button[aria-label]");
    const total = await cells.count();
    expect(total).toBeGreaterThanOrEqual(168);
    const accentSelectors = [
      "button.bg-accent-50",
      "button.bg-accent-100",
      "button.bg-accent-300",
      "button.bg-accent-500",
      "button.bg-accent-600",
      "button.bg-accent-700",
    ];
    let accentCount = 0;
    for (const sel of accentSelectors) {
      accentCount += await heatmapSection.locator(sel).count();
    }
    expect(accentCount).toBeGreaterThanOrEqual(40);
  });

  test("country table renders 8 rows with progress bars + leader highlight", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ko/demo", { waitUntil: "networkidle" });
    const countrySection = page.locator('section:has-text("국가별 분포")').first();
    await countrySection.scrollIntoViewIfNeeded();
    const rows = countrySection.locator("tbody tr");
    expect(await rows.count()).toBe(8);
    // Leader row gets accent-700 (the rest accent-500) — this is the new "다르게 뜨는" cue
    // that the first row owns the audience. If a future refactor strips the leader class, the
    // visual hierarchy breaks silently; this catches it.
    const leaderBars = countrySection.locator("div.bg-accent-700");
    expect(await leaderBars.count()).toBeGreaterThanOrEqual(1);
  });

  test("group eyebrows expose step labels 1/4 … 4/4", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ko/demo", { waitUntil: "networkidle" });
    for (const i of [1, 2, 3, 4]) {
      const label = page.locator(`text=${i} / 4`).first();
      await expect(label).toBeVisible();
    }
  });
});
