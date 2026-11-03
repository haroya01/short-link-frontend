import { expect, test, type Page } from "@playwright/test";

// MOCK-ON: /e/[slug] is served by modules/events/api/_mocks.ts on the server. The browser's own
// registration and cancel calls are client-side, so page.route answers them.

const TOKEN = "tok-e2e-remembered";

async function openEvent(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem("kurl:cookie-consent:v1", "accepted"));
  await page.route("**/api/v1/pow/challenge", (route) =>
    route.fulfill({ json: { enforced: false, challenge: "", difficulty: 0 } }),
  );
  await page.route("**/api/v1/public/events/mock-open/registrations", (route) =>
    route.fulfill({ json: { registrationId: 1, cancelToken: TOKEN, spotsLeft: 12 } }),
  );
  await page.route("**/api/v1/public/events/registrations/cancel", (route) => route.fulfill({ status: 204 }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko/e/mock-open");
}

async function registerWithKakao(page: Page) {
  await page.locator('[data-field="name"]').fill("김도현");
  await page.locator('[data-field="contact"]').fill("dohyun_kakao");
  await page.locator('[data-field="q1"]').fill("블로그 글");
  await page.locator('[data-field="consent"]').check();
  await page.getByRole("button", { name: "신청하기", exact: true }).click();
  await expect(page.getByRole("heading", { name: "신청했어요" })).toBeVisible();
}

test("a registration without email still finds its cancel link after a refresh, and the address carries no token", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openEvent(page);
  await registerWithKakao(page);
  expect(page.url()).not.toContain(TOKEN);

  await page.reload();
  await expect(page.getByRole("heading", { name: "이미 신청했어요" })).toBeVisible();
  await expect(page.locator("#register form")).toHaveCount(0);
  await page.getByRole("button", { name: "취소 링크 복사" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(new RegExp(`/ko/e/mock-open\\?cancel=${TOKEN}$`));
  expect(page.url()).not.toContain(TOKEN);

  await page.getByRole("button", { name: "다른 사람도 신청하기" }).click();
  await expect(page.locator('[data-field="name"]')).toBeVisible();
});

test("cancelling through the link forgets the registration on this device", async ({ page }) => {
  await openEvent(page);
  await registerWithKakao(page);

  await page.goto(`/ko/e/mock-open?cancel=${TOKEN}`);
  await page.getByRole("button", { name: "신청 취소하기" }).click();
  await expect(page.getByRole("heading", { name: "취소되었어요" })).toBeVisible();

  await page.goto("/ko/e/mock-open");
  await expect(page.locator('[data-field="name"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "이미 신청했어요" })).toHaveCount(0);
});

test("with storage blocked the page still registers and falls back to the form on the next visit", async ({ page }) => {
  await page.addInitScript(() => {
    const { getItem, setItem } = Storage.prototype;
    const blocked = (key: string) => key.startsWith("kurl:event-registration:");
    Storage.prototype.getItem = function (key: string) {
      if (blocked(key)) throw new Error("blocked");
      return getItem.call(this, key);
    };
    Storage.prototype.setItem = function (key: string, value: string) {
      if (blocked(key)) throw new Error("blocked");
      return setItem.call(this, key, value);
    };
  });
  await openEvent(page);
  await registerWithKakao(page);

  await page.reload();
  await expect(page.locator('[data-field="name"]')).toBeVisible();
});
