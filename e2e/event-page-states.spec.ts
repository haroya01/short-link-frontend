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
      ["mock-ended", "끝난 모임이에요."],
      ["mock-full", "자리가 다 찼어요. 취소가 생기면 다시 열려요."],
      ["mock-closed", "신청이 마감되었어요."],
      ["mock-canceled", "이 모임은 취소되었어요."],
    ] as const) {
      test(`${slug}: one status line over one switched-off button, no form`, async ({ page }) => {
        await page.goto(`/ko/e/${slug}`);
        await expect(page.getByText(notice, { exact: true })).toBeVisible();
        await expect(register(page)).toHaveCount(1);
        await expect(register(page)).toBeDisabled();
        await expect(page.locator("#register form")).toHaveCount(0);
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
