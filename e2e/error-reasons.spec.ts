import { expect, test } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

/**
 * 사용자가 입력을 고쳐서 풀 수 있는 실패는 "다시 시도해 주세요" 대신 이유를 말한다.
 * 서버 오류 코드는 errors.<CODE> 번역으로, 미리 알 수 있는 건 보내기 전에 화면이 막는다.
 */
const CODE = "e2eReasons";

test.describe("실패의 이유를 말한다", () => {
  test("QR 캠페인: 끝나는 시각이 시작보다 앞이면 바로 알리고 만들기를 막는다", async ({ page }) => {
    await signIn(page);
    await mockBackend(page, {});
    await page.goto("/ko/campaigns/new");

    await page.getByLabel("QR 캠페인 이름").fill("가을 전단지");
    const submit = page.getByRole("button", { name: "QR 캠페인 만들기" });
    await expect(submit).toBeEnabled();

    await page.getByRole("button", { name: "시작 시간 예약" }).click();
    await page.locator('input[type="datetime-local"]').first().fill("2099-05-10T10:00");
    await page.getByLabel("종료 시점").fill("2099-05-01T10:00");

    await expect(page.getByText("끝나는 날이 시작하는 날보다 뒤여야 해요.")).toBeVisible();
    await expect(submit).toBeDisabled();
  });

  test("목적지 한도를 넘기면 몇 개까지인지 알린다", async ({ page }) => {
    await signIn(page);
    await mockBackend(page, {
      [`GET /api/v1/links/${CODE}/destinations`]: (route) => route.fulfill({ json: [] }),
      [`POST /api/v1/links/${CODE}/destinations`]: (route) =>
        route.fulfill({
          status: 400,
          json: { status: 400, detail: "too many destinations", code: "TOO_MANY_DESTINATIONS", limit: 4 },
        }),
    });
    await page.goto(`/ko/stats/${CODE}#settings`);

    const section = page.locator("section", { hasText: "A/B 분배" });
    await section.getByPlaceholder("https://variant-a.example.com").fill("https://b.example.com");
    await section.getByRole("button", { name: "추가" }).click();

    await expect(page.getByText("목적지는 4개까지 넣을 수 있어요.")).toBeVisible();
  });
});
