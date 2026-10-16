import { expect, test, type Locator } from "@playwright/test";

// mock-on 레인: 목 빌드는 @dohyun 으로 로그인해 시작하고, kurl:mock-signed-out 을 심으면 처음 온 방문자가 된다.
const color = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).color);
const SECONDARY_INK = "rgb(109, 117, 112)";

test("the signed-out wall is one line and a text action, without a centred icon", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-signed-out", "1"));
  await page.goto("/ko/more");
  const wall = page.getByTestId("sign-in-empty");
  await expect(wall.getByRole("heading", { level: 1, name: "도구와 앱을 보려면 로그인하세요" })).toBeVisible();
  await expect(wall.getByRole("button", { name: "로그인", exact: true })).toBeVisible();
  await expect(wall.locator("svg")).toHaveCount(0);
  await expect(wall.getByRole("heading", { level: 1 })).toHaveCSS("text-align", "start");
});

test("the phone composer's submit is a word, with no arrow in front", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko/dashboard");
  const submit = page.locator("form").filter({ has: page.getByRole("textbox") }).getByRole("button", { name: "단축", exact: true });
  await expect(submit).toBeVisible();
  await expect(submit.locator("svg")).toHaveCount(0);
});

test("더보기 rows carry only their names", async ({ page }) => {
  await page.goto("/ko/more");
  await expect(page.getByRole("link", { name: "공개 프로필", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "CTA 라이브러리", exact: true })).toBeVisible();
});

test("required fields use one secondary-ink mark that screen readers skip", async ({ page }) => {
  await page.goto("/ko/events/new");
  const title = page.getByRole("textbox", { name: /제목/ }).first();
  await expect(title).toBeVisible();
  const mark = page.locator("label span[aria-hidden]", { hasText: "*" }).first();
  await expect(mark).toBeVisible();
  expect(await color(mark)).toBe(SECONDARY_INK);
});
