import { expect, test } from "@playwright/test";

/**
 * 모바일 § 가 한 viewport 에 fit 되어야 한다는 룰. 절대 cap (예: 780px) 이 아니라 viewport
 * 높이 기준으로 검사 — 섹션이 h-[100svh] 로 강제 fit. iPhone SE (667px) 같은 작은 폰에서도
 * 한눈에 들어와야 한다는 사용자 요구.
 */
const VIEWPORTS = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14", width: 390, height: 844 },
] as const;

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

      test(`/ko/qr-campaigns — 각 § height <= viewport ${vp.height}px (한눈에 fit)`, async ({
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
        // svh 는 브라우저 chrome 빼고 계산되지만 playwright headless 엔 chrome 없어서 viewport
        // 값과 같음. 1px 반올림 여유.
        const limit = vp.height + 1;
        for (const { idx, h } of heights) {
          expect(
            h,
            `§${idx + 1} height ${Math.round(h)}px > viewport ${vp.height}px (overflow)`,
          ).toBeLessThanOrEqual(limit);
        }
      });
    });
  }
});
