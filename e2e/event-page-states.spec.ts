import { expect, test, type Page } from "@playwright/test";

// MOCK-ON: /e/[slug] fetches on the server, out of page.route's reach. modules/events/api/_mocks.ts
// serves one event per state; mock-ended is a past event the server still marks as taking registrations.

const register = (page: Page) => page.getByRole("button", { name: "신청하기", exact: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:cookie-consent:v1", "accepted"));
});

for (const viewport of [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("an open event has one register button and it is the form's own", async ({ page }) => {
      await page.goto("/ko/e/mock-open");
      await expect(page.getByRole("heading", { level: 1, name: "성수 모각코 11월" })).toBeVisible();
      await expect(register(page)).toHaveCount(1);
      await expect(register(page)).toBeEnabled();
      await expect(register(page)).toHaveAttribute("type", "submit");
      await expect(page.locator("#register").getByRole("button", { name: "신청하기", exact: true })).toHaveCount(1);
    });

    for (const [slug, notice] of [
      ["mock-full", "자리가 다 찼어요. 취소가 생기면 다시 열려요."],
      ["mock-closed", "신청이 마감되었어요."],
    ] as const) {
      test(`${slug}: one status line over one switched-off button, no form and no seats left`, async ({ page }) => {
        await page.goto(`/ko/e/${slug}`);
        await expect(page.getByText(notice, { exact: true })).toBeVisible();
        await expect(register(page)).toHaveCount(1);
        await expect(register(page)).toBeDisabled();
        await expect(page.locator("#register form")).toHaveCount(0);
        await expect(page.getByText(/남은 자리/)).toHaveCount(0);
      });
    }

    for (const [slug, notice] of [
      ["mock-ended", "끝난 모임이에요."],
      ["mock-canceled", "이 모임은 취소되었어요."],
    ] as const) {
      test(`${slug}: one status line and nothing to press`, async ({ page }) => {
        await page.goto(`/ko/e/${slug}`);
        await expect(page.getByText(notice, { exact: true })).toBeVisible();
        await expect(register(page)).toHaveCount(0);
        await expect(page.locator("#register form")).toHaveCount(0);
        await expect(page.getByText(/남은 자리/)).toHaveCount(0);
      });
    }
  });
}

test("an empty submit puts each error right under its own field and focuses the first", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko/e/mock-open");
  await register(page).click();

  const name = page.locator("#ev-name");
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#ev-name-error")).toHaveText("이름을 적어 주세요");
  await expect(page.locator("#ev-contact-error")).toHaveText("연락처를 적어 주세요");
  await expect(page.locator("#ev-q-1-error")).toHaveText("답을 적어 주세요");
  await expect(page.locator("#ev-consent-error")).toHaveText("개인정보 제공에 동의해 주세요");

  const field = await name.boundingBox();
  const error = await page.locator("#ev-name-error").boundingBox();
  expect(error!.y).toBeGreaterThan(field!.y + field!.height - 1);
  expect(error!.y - (field!.y + field!.height)).toBeLessThan(16);

  await name.fill("김도현");
  await expect(page.locator("#ev-name-error")).toHaveCount(0);
});

test("the page hydrates without a text mismatch, so the pre-paint flags on <html> survive", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/ko/e/mock-open");
  await expect(register(page)).toBeEnabled();
  await page.waitForTimeout(500);
  await expect(page.locator("html")).toHaveAttribute("data-js", "");
  expect(errors.filter((message) => /#4(18|23|25)\b|hydrat/i.test(message))).toEqual([]);
});

async function fillForm(page: Page) {
  await page.locator('[data-field="name"]').fill("김도현");
  await page.locator('[data-field="contact"]').fill("dohyun_kakao");
  await page.locator('[data-field="q1"]').fill("블로그 글");
  await page.locator('[data-field="consent"]').check();
}

test("when the last seat goes while filling in, the form closes into the full state", async ({ page }) => {
  await page.route("**/api/v1/pow/challenge", (route) =>
    route.fulfill({ json: { enforced: false, challenge: "", difficulty: 0 } }),
  );
  await page.route("**/api/v1/public/events/mock-open/registrations", (route) =>
    route.fulfill({ status: 409, json: { status: 409, code: "EVENT_FULL", detail: "full" } }),
  );
  await page.goto("/ko/e/mock-open");
  await expect(page.getByText("남은 자리 13 / 20", { exact: false })).toBeVisible();
  await fillForm(page);
  await register(page).click();

  await expect(page.getByText("자리가 다 찼어요. 취소가 생기면 다시 열려요.", { exact: true })).toBeVisible();
  await expect(page.locator("#register form")).toHaveCount(0);
  await expect(register(page)).toBeDisabled();
  await expect(page.getByText(/남은 자리/)).toHaveCount(0);
});

test("after registering, the calendar is one menu with Google, Outlook and a calendar file", async ({ page }) => {
  await page.route("**/api/v1/pow/challenge", (route) =>
    route.fulfill({ json: { enforced: false, challenge: "", difficulty: 0 } }),
  );
  await page.route("**/api/v1/public/events/mock-open/registrations", (route) =>
    route.fulfill({ json: { registrationId: 1, cancelToken: "tok-cal", spotsLeft: 12 } }),
  );
  await page.goto("/ko/e/mock-open");
  await fillForm(page);
  await register(page).click();
  await expect(page.getByRole("heading", { name: "신청했어요" })).toBeVisible();

  await expect(page.getByText("Google 캘린더에 추가")).toHaveCount(0);
  await page.getByRole("button", { name: "내 캘린더에 추가" }).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem")).toHaveText(["Google 캘린더", "Outlook", "Apple 캘린더(.ics) 다운로드"]);
  await expect(menu.getByRole("menuitem", { name: "Google 캘린더" })).toHaveAttribute("href", /calendar\.google\.com/);
  const download = page.waitForEvent("download");
  await menu.getByRole("menuitem", { name: /\.ics/ }).click();
  expect((await download).suggestedFilename()).toBe("mock-open.ics");
});

test("the share card is drawn from the title, date and place", async ({ page, request }) => {
  await page.goto("/ko/e/mock-open");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/ko\/e\/mock-open\/opengraph-image/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const res = await request.get("/ko/e/mock-open/opengraph-image");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
});
