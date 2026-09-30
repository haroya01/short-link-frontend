import { expect, test } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

/**
 * 탭 제목은 "화면 이름 · kurl". 로그인 뒤 화면들이 홈 제목 하나를 같이 쓰면 탭 여러 개를 띄웠을 때
 * 구분되지 않는다(WCAG 2.4.2). 브랜드를 직접 붙이던 제목은 틀과 겹쳐 "· kurl · kurl" 이 되지 않아야 한다.
 */
const SIGNED_IN: [string, string][] = [
  ["/ko/dashboard", "내 링크 · kurl"],
  ["/ko/analytics", "분석 · kurl"],
  ["/ko/campaigns", "QR 캠페인 · kurl"],
  ["/ko/events", "모집 · kurl"],
  ["/ko/ctas", "CTA 라이브러리 · kurl"],
  ["/ko/settings", "설정 · kurl"],
  ["/ko/settings/profile", "공개 프로필 · kurl"],
  ["/ko/more", "더보기 · kurl"],
  ["/ko/stats/e2eTitle", "/e2eTitle · kurl"],
];

const PUBLIC: [string, string][] = [
  ["/ko", "kurl · URL 단축과 클릭 분석"],
  ["/ko/login", "로그인 · kurl"],
  ["/ko/about", "서비스 소개 · kurl"],
  ["/ko/terms", "이용약관 · kurl"],
  ["/ko/learn", "숏링크 · URL 단축 · 링크 인 바이오 가이드 · kurl"],
  ["/ko/use/free-url-shortener", "무료 URL 단축과 클릭 통계 · kurl"],
  ["/ko/stats/e2eTitle/public", "/e2eTitle · 공개 통계 · kurl"],
];

test.describe("탭 제목", () => {
  for (const [path, title] of SIGNED_IN) {
    test(`${path} 는 "${title}"`, async ({ page }) => {
      await signIn(page);
      await mockBackend(page, {});
      await page.goto(path);
      await expect(page).toHaveTitle(title);
    });
  }

  test("공개 화면은 브랜드가 한 번만 붙는다", async ({ page }) => {
    for (const [path, title] of PUBLIC) {
      await page.goto(path);
      await expect(page).toHaveTitle(title);
    }
  });

  test("활용 사례 화면의 큰 제목에는 브랜드를 붙이지 않는다", async ({ page }) => {
    await page.goto("/ko/use/free-url-shortener");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("무료 URL 단축과 클릭 통계");
  });
});
