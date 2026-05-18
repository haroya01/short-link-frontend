import { expect, test } from "@playwright/test";
import path from "node:path";

/**
 * Desktop landing-page artifact spec. Mirrors {@link landing-mobile.spec.ts} but in two
 * wide viewports — laptop (1280x720, a typical 13-inch MacBook) and full-HD desktop
 * (1920x1080) — so reviewers can confirm the mobile-first refactor still reads correctly
 * at the canvas widths most desktop visitors actually use.
 *
 * <p>Same artifact-not-baseline contract: each viewport saves a tall full-page PNG plus
 * focused per-section element screenshots to
 * {@code test-results/landing-desktop/<viewport>/<section>.png}. The horizontal-overflow
 * guard at the end fails loudly if any newly added section pushes past the viewport.
 *
 * <p>The selector list intentionally matches the mobile spec one-for-one so the two
 * artifact trees diff cleanly side-by-side during PR review.
 */

const SECTIONS: { id: string; selector: string }[] = [
  { id: "hero", selector: "section.grid-bg" },
  { id: "previews", selector: "section:has(> div > ul.grid)" },
  { id: "counters", selector: "section:has(dl.grid-cols-2)" },
  { id: "features", selector: 'section:has-text("단순 단축이 아닙니다")' },
  { id: "why-kurl", selector: 'section:has-text("이걸 다른 데선 왜 안 줄까")' },
  { id: "faq", selector: 'section:has-text("자주 묻는 질문")' },
];

const VIEWPORTS: { name: string; width: number; height: number }[] = [
  { name: "laptop-1280", width: 1280, height: 720 },
  { name: "desktop-1920", width: 1920, height: 1080 },
];

test.describe("landing desktop artifacts", () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name} — section screenshots`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/ko", { waitUntil: "networkidle" });

      const outDir = path.join("test-results", "landing-desktop", vp.name);

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

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(2);
    });
  }
});
