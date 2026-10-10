import { expect, test } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";
import { mockLinksResponse } from "../lib/api/_links-mocks";
import { expectOnTop, toastBy } from "./helpers/on-top";

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

    await expectOnTop(toastBy(page, "저장했어요."));
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

    const section = page.locator("section", { hasText: "공개 기간" });
    await section.getByRole("switch", { name: "공개 예약" }).click();
    await section.getByLabel("여는 시각").fill("2099-05-01T10:30");
    await section.getByRole("button", { name: "저장" }).click();

    await expectOnTop(toastBy(page, "저장했어요."));
    expect(sent?.opensAt).toBe(await page.evaluate(() => new Date("2099-05-01T10:30").toISOString()));
  });

  test("expiry and its closing message are set in the same place as the opening time", async ({ page }) => {
    let sent: { expiresAt?: string; expiredMessage?: string } | undefined;
    await signIn(page);
    await mockBackend(page, {
      [`PATCH /api/v1/links/${CODE}`]: (route) => {
        sent = JSON.parse(route.request().postData() ?? "{}");
        return route.fulfill({ json: { shortCode: CODE, expiresAt: sent?.expiresAt ?? null } });
      },
    });
    await page.goto(`/ko/stats/${CODE}#settings`);

    const section = page.locator("section", { hasText: "공개 기간" });
    await section.getByRole("switch", { name: "만료" }).click();
    await section.getByLabel("닫는 시각").fill("2099-06-01T18:00");
    await section.getByLabel("만료 시 안내 메시지 (선택)").fill("행사가 끝났어요");
    await section.getByRole("button", { name: "저장" }).click();

    await expectOnTop(toastBy(page, "저장했어요."));
    expect(sent?.expiresAt).toBe(await page.evaluate(() => new Date("2099-06-01T18:00").toISOString()));
    expect(sent?.expiredMessage).toBe("행사가 끝났어요");
  });

  test("opening after the old expiry while extending the expiry saves in one go", async ({ page }) => {
    let storedExpiresAt: string | null = "2099-06-01T09:00:00.000Z";
    const order: string[] = [];
    await signIn(page);
    await mockBackend(page, {
      [`GET /api/v1/links/${CODE}/detail`]: (route) => {
        const base = mockLinksResponse(`/api/v1/links/${CODE}/detail`, "GET", undefined) as Record<string, unknown>;
        return route.fulfill({ json: { ...base, shortCode: CODE, opensAt: null, expiresAt: storedExpiresAt, expiredMessage: null } });
      },
      [`PATCH /api/v1/links/${CODE}`]: (route) => {
        order.push("expiry");
        const body = JSON.parse(route.request().postData() ?? "{}");
        if ("expiresAt" in body) storedExpiresAt = body.expiresAt;
        return route.fulfill({ json: { shortCode: CODE, expiresAt: storedExpiresAt } });
      },
      [`PATCH /api/v1/links/${CODE}/visit-options`]: (route) => {
        order.push("opens");
        const body = JSON.parse(route.request().postData() ?? "{}");
        // 서버 규칙 그대로: 공개 시각은 '저장돼 있는' 만료보다 앞이어야 한다.
        if (body.opensAt && storedExpiresAt && new Date(body.opensAt) >= new Date(storedExpiresAt)) {
          return route.fulfill({ status: 400, json: { status: 400, detail: "link would open after it expires", code: "OPENS_AFTER_EXPIRY" } });
        }
        return route.fulfill({ json: { shortCode: CODE, openInBrowser: false, opensAt: body.opensAt ?? null } });
      },
    });
    await page.goto(`/ko/stats/${CODE}#settings`);

    const section = page.locator("section", { hasText: "공개 기간" });
    await section.getByRole("switch", { name: "공개 예약" }).click();
    await section.getByLabel("여는 시각").fill("2099-07-01T10:00");
    await section.getByLabel("닫는 시각").fill("2099-08-01T18:00");
    await section.getByRole("button", { name: "저장" }).click();

    await expectOnTop(toastBy(page, "저장했어요."));
    expect(order).toEqual(["expiry", "opens"]);
  });

  test("the edit dialog keeps to what the link is and points to link settings for the rest", async ({ page }) => {
    await signIn(page);
    await mockBackend(page);
    await page.goto("/ko/dashboard");

    await page.getByRole("button", { name: "더보기" }).first().click();
    await page.getByRole("menuitem", { name: "편집" }).click();
    const dialog = page.getByRole("dialog", { name: "링크 편집" });
    await expect(dialog.getByRole("tab")).toHaveText(["기본", "태그", "공유 카드"]);
    await expect(dialog.getByText("만료 일시")).toHaveCount(0);
    await expect(dialog.getByRole("link", { name: "링크 설정" })).toHaveAttribute("href", /\/stats\/[^/]+#settings$/);
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
