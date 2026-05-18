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
 * <p>Not a regression baseline — these are saved artifacts, not `toHaveScreenshot` snapshots,
 * so the suite never fails on small drift. The horizontal-overflow guard is the only hard
 * assertion.
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
});
