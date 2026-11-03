import { expect, test } from "@playwright/test";

// e2e-mock 레인에는 백엔드가 없다(NEXT_PUBLIC_API_BASE=http://localhost:0). 서버의 모집 조회가 늘 실패하므로
// 백엔드 순단과 같은 상태다.
test.describe("백엔드 순단 중의 모집 페이지", () => {
  test("없는 모집(404)이 아니라 HTTP 500 과 다시 시도 화면", async ({ page }) => {
    const res = await page.goto("/ko/e/seongsu");
    expect(res?.status()).toBe(500);
    await expect(page.getByText("불러오지 못했어요")).toBeVisible();
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
    await expect(page.getByTestId("not-found")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("공유 카드 이미지는 대체 카드로 그리고 캐시에 남기지 않는다", async ({ request }) => {
    const res = await request.get("/ko/e/seongsu/opengraph-image");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
    expect(res.headers()["cache-control"]).toBe("no-store");
  });
});
