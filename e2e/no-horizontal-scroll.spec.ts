import { expect, test } from "@playwright/test";

/**
 * 모바일에서 페이지 전체가 가로로 밀리던 회귀를 막는다. 원인은 늘 같은 모양이다 — flex/grid 아이템의
 * 기본 min-width 가 auto 라, 안에 nowrap(=truncate) 텍스트가 있으면 트랙이 그 min-content 아래로
 * 못 줄어들고 컨테이너를 통째로 밀어낸다. 랜딩에서 긴 원본 URL 한 줄이 390 화면을 79px 밀었고,
 * 헤더·쿠키바·하단 탭바가 같이 어긋났다.
 *
 * 세로 스크롤바가 없는 환경 기준이라 1px 여유도 두지 않는다 — 0 이 아니면 무언가 삐져나온 것이다.
 */
const PATHS = ["/ko", "/ko/qr-campaigns", "/ko/demo"];

for (const path of PATHS) {
  for (const width of [320, 390]) {
    test(`${path} 은 ${width}px 에서 가로로 밀리지 않는다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(800);

      const { scrollWidth, clientWidth, culprit } = await page.evaluate(() => {
        const doc = document.documentElement;
        // 넘친 게 있으면 어느 요소인지까지 알려준다 — 실패 로그만 보고 바로 찾을 수 있게.
        let culprit = "";
        if (doc.scrollWidth > doc.clientWidth) {
          for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.right > doc.clientWidth + 1) {
              culprit = `${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 80)} right=${Math.round(r.right)}`;
              break;
            }
          }
        }
        return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, culprit };
      });

      expect(scrollWidth, `가로 오버플로 ${scrollWidth - clientWidth}px — ${culprit}`).toBeLessThanOrEqual(
        clientWidth,
      );
    });
  }
}
