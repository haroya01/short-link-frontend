import { expect, test } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

const CODE = "e2eVisit";

test.describe("visit options", () => {
  test("the owner sends KakaoTalk and LINE visitors to their browser", async ({ page }) => {
    let sent: { openInBrowser?: boolean } | undefined;
    await signIn(page);
    await mockBackend(page, {
      [`PATCH /api/v1/links/${CODE}/visit-options`]: (route) => {
        sent = JSON.parse(route.request().postData() ?? "{}");
        return route.fulfill({ json: { shortCode: CODE, openInBrowser: Boolean(sent?.openInBrowser) } });
      },
    });
    await page.goto(`/ko/stats/${CODE}#settings`);

    const toggle = page.getByRole("switch", { name: "카카오톡·LINE에선 기본 브라우저로 열기" });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await toggle.click();

    await expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(sent).toEqual({ openInBrowser: true });
  });

  test("the owner writes a note that visitors see before moving on", async ({ page }) => {
    let sent: { splash?: unknown } | undefined;
    await signIn(page);
    await mockBackend(page, {
      "GET /api/v1/ctas": (route) =>
        route.fulfill({
          json: [
            {
              id: 9,
              label: "앱 받기",
              url: "https://apps.example.com/install",
              style: "PRIMARY",
              purpose: "DOWNLOAD",
              deleted: false,
              createdAt: "2026-09-01T00:00:00Z",
              updatedAt: "2026-09-01T00:00:00Z",
            },
          ],
        }),
      [`PATCH /api/v1/links/${CODE}/visit-options`]: (route) => {
        sent = JSON.parse(route.request().postData() ?? "{}");
        return route.fulfill({ json: { shortCode: CODE, openInBrowser: false, splash: sent?.splash } });
      },
    });
    await page.goto(`/ko/stats/${CODE}#settings`);

    const section = page.locator("section", { hasText: "방문자가 열 때" });
    await section.getByRole("switch", { name: "잠깐 보여주기" }).click();
    await section.getByPlaceholder(/쿠폰 코드 SPRING20/).fill("쿠폰 SPRING20");
    await section.getByRole("radio", { name: "5초" }).click();
    await section.getByRole("combobox").selectOption({ label: "앱 받기" });
    await section.getByRole("button", { name: "저장" }).click();

    await expect(page.getByText("저장했어요.")).toBeVisible();
    expect(sent).toEqual({ splash: { enabled: true, message: "쿠폰 SPRING20", seconds: 5, ctaId: 9 } });
  });

  test("the owner schedules when the link opens", async ({ page }) => {
    let sent: { opensAt?: string } | undefined;
    await signIn(page);
    await mockBackend(page, {
      [`PATCH /api/v1/links/${CODE}/visit-options`]: (route) => {
        sent = JSON.parse(route.request().postData() ?? "{}");
        return route.fulfill({ json: { shortCode: CODE, openInBrowser: false, opensAt: sent?.opensAt ?? null } });
      },
    });
    await page.goto(`/ko/stats/${CODE}#settings`);

    const section = page.locator("section", { hasText: "방문자가 열 때" });
    await section.getByRole("switch", { name: "공개 예약" }).click();
    await section.getByLabel("여는 시각").fill("2099-05-01T10:30");
    await section.getByRole("button", { name: "저장" }).click();

    await expect(page.getByText("저장했어요.")).toBeVisible();
    expect(sent?.opensAt).toBe(await page.evaluate(() => new Date("2099-05-01T10:30").toISOString()));
  });

  test("a failed save puts the switch back", async ({ page }) => {
    await signIn(page);
    await mockBackend(page, {
      [`PATCH /api/v1/links/${CODE}/visit-options`]: (route) => route.fulfill({ status: 500, json: {} }),
    });
    await page.goto(`/ko/stats/${CODE}#settings`);

    const toggle = page.getByRole("switch", { name: "카카오톡·LINE에선 기본 브라우저로 열기" });
    await toggle.click();

    await expect(toggle).toHaveAttribute("aria-checked", "false");
  });
});
