import { expect, test } from "@playwright/test";

/**
 * 모바일 § 가 한 viewport 에 fit 되어야 한다는 룰. 절대 cap (예: 780px) 이 아니라 viewport
 * 높이 기준으로 검사. iPhone SE (667px) 같은 작은 폰에서도 한눈에 들어와야 한다는 사용자 요구.
 */
const VIEWPORTS = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14", width: 390, height: 844 },
] as const;

/**
 * Hero (§1) 텍스트가 새로고침마다 보이는지. 예전 등장 애니메이션이 hydration race 로 opacity-0 에
 * 멈춘 적이 있다. 5번 reload 해서 한 번이라도 안 보이면 fail.
 */
test.describe("qr-campaigns hero visible across reloads", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("/ko/qr-campaigns — hero 텍스트가 매번 보인다 (5 reload)", async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.goto("/ko/qr-campaigns");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
      const opacities = await page.evaluate(() => {
        const hero = document.querySelector('[data-section-idx="0"]');
        if (!hero) return null;
        const title = hero.querySelector("h1");
        const lead = hero.querySelector("h1 + p");
        return {
          title: title ? Number(getComputedStyle(title).opacity) : null,
          lead: lead ? Number(getComputedStyle(lead).opacity) : null,
        };
      });
      expect(opacities, `reload #${i + 1}: hero DOM not found`).not.toBeNull();
      expect(opacities!.title, `reload #${i + 1}: title stuck at opacity ${opacities!.title}`).toBeGreaterThan(0.9);
      expect(opacities!.lead, `reload #${i + 1}: lead stuck at opacity ${opacities!.lead}`).toBeGreaterThan(0.9);
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
