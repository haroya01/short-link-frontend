import { expect, test } from "@playwright/test";

/**
 * §1 (Hero+KPI) 와 §3 (Poster) 가 모바일에서 너무 길게 흘러나오던 회귀 방지.
 * 측정 기반 cap 780px (post-fix 최대 § = 728px → 약 50px 버퍼). py-12 → py-20 되돌리거나
 * Poster aspect 4/5 → 1/1.414 되돌리면 ~790px 이상으로 튀어 fail.
 */
const VIEWPORTS = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14", width: 390, height: 844 },
] as const;

const MAX_SECTION_HEIGHT_PX = 780;

test.describe("qr-campaigns mobile section height", () => {
  for (const vp of VIEWPORTS) {
    test.describe(`viewport ${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test(`/ko/qr-campaigns — narrative 섹션 각각 height <= ${MAX_SECTION_HEIGHT_PX}px`, async ({
        page,
      }) => {
        await page.goto("/ko/qr-campaigns");
        await page.waitForLoadState("networkidle");

        const heights = await page.evaluate(() => {
          const out: { idx: number; h: number }[] = [];
          const nodes = document.querySelectorAll<HTMLElement>("[data-section-idx]");
          for (const el of Array.from(nodes)) {
            const idx = Number(el.getAttribute("data-section-idx"));
            out.push({ idx, h: el.getBoundingClientRect().height });
          }
          return out;
        });

        expect(heights.length).toBeGreaterThan(0);
        for (const { idx, h } of heights) {
          expect(
            h,
            `§${idx + 1} height ${Math.round(h)}px > limit ${MAX_SECTION_HEIGHT_PX}px`,
          ).toBeLessThanOrEqual(MAX_SECTION_HEIGHT_PX);
        }
      });
    });
  }
});
