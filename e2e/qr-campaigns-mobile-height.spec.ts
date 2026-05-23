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

/**
 * Hero (§1) 텍스트가 새로고침마다 fade-in 되는지. 이전엔 @keyframes hero-fade 가
 * `<style jsx global>` (styled-jsx 컴포넌트) 안에 있어서 hydration race 가 나면 keyframe
 * 정의 전 animation 이 시작 → 이름 unknown → opacity-0 에 영영 멈춤. 5번 reload 해서 한 번이라도
 * 못 뜨면 fail.
 */
test.describe("qr-campaigns hero visible across reloads", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("/ko/qr-campaigns — hero 텍스트가 매번 fade-in (5 reload)", async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.goto("/ko/qr-campaigns");
      await page.waitForLoadState("networkidle");
      // 1.5s 시점이면 hero 의 가장 늦은 chip (delay 850+200=1050ms + 700ms = 1.75s) 직전,
      // 가장 빠른 eyebrow (delay 120ms + 700ms = 820ms) 는 이미 끝나있어야.
      await page.waitForTimeout(1500);
      const opacities = await page.evaluate(() => {
        const hero = document.querySelector('[data-section-idx="0"]');
        if (!hero) return null;
        const eyebrow = hero.querySelector("p.text-accent-700");
        const titleSpans = hero.querySelectorAll("h1 span");
        return {
          eyebrow: eyebrow ? Number(getComputedStyle(eyebrow).opacity) : null,
          title1: titleSpans[0] ? Number(getComputedStyle(titleSpans[0]).opacity) : null,
          title2: titleSpans[1] ? Number(getComputedStyle(titleSpans[1]).opacity) : null,
        };
      });
      expect(opacities, `reload #${i + 1}: hero DOM not found`).not.toBeNull();
      expect(opacities!.eyebrow, `reload #${i + 1}: eyebrow stuck at opacity ${opacities!.eyebrow}`).toBeGreaterThan(0.9);
      expect(opacities!.title1, `reload #${i + 1}: title1 stuck at opacity ${opacities!.title1}`).toBeGreaterThan(0.9);
      expect(opacities!.title2, `reload #${i + 1}: title2 stuck at opacity ${opacities!.title2}`).toBeGreaterThan(0.9);
    }
  });
});

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
