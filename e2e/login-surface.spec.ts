import { expect, test, type Page } from "@playwright/test";

// mock-on 레인: 목 빌드는 늘 @dohyun 으로 로그인해 시작한다. kurl:mock-signed-out 을 심으면 목 세션을
// 만들지 않아 처음 온 방문자의 화면을 본다.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => window.localStorage.setItem("kurl:mock-signed-out", "1"));
});

const POST = "/ko/p/dohyun/nextjs-14-app-router-blog";
const sheet = (page: Page, line: string) => page.getByRole("dialog", { name: line });

test("헤더의 글쓰기는 화면을 옮기지 않고 로그인 시트를 띄운다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko/blog");
  await page.getByRole("banner").getByRole("button", { name: "글쓰기" }).click();
  const ask = sheet(page, "글을 쓰려면 로그인하세요");
  await expect(ask.getByRole("button", { name: "Google 계정으로 로그인" })).toBeVisible();
  await expect(page).toHaveURL(/\/ko\/blog$/);
  await page.keyboard.press("Escape");
  await expect(ask).toHaveCount(0);
});

test("글쓰기 화면에 바로 오면 로그인 페이지로 튕기지 않고 한 줄과 로그인 버튼만 본다", async ({ page }) => {
  await page.goto("/ko/blog/write");
  const empty = page.getByTestId("sign-in-empty");
  await expect(empty.getByRole("heading", { level: 1, name: "글을 쓰려면 로그인하세요" })).toBeVisible();
  await expect(page).toHaveURL(/\/ko\/blog\/write$/);
  await empty.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(sheet(page, "글을 쓰려면 로그인하세요")).toBeVisible();
});

test("글의 좋아요와 댓글은 그 동작을 말하는 시트를 띄운다", async ({ page }) => {
  await page.goto(POST);
  await page.getByRole("button", { name: /좋아요/ }).first().click();
  const like = sheet(page, "좋아요를 누르려면 로그인하세요");
  await expect(like).toBeVisible();
  await like.getByRole("button", { name: "닫기" }).click();
  await expect(like).toHaveCount(0);

  await page.getByTestId("comment-composer-placeholder").click();
  await expect(sheet(page, "댓글을 남기려면 로그인하세요")).toBeVisible();
});

test("시트의 Google 버튼은 지금 보던 글로 돌아오게 로그인을 시작한다", async ({ page }) => {
  await page.route("**/oauth2/authorization/google", (route) => route.fulfill({ status: 200, body: "google" }));
  await page.goto(POST);
  await page.getByRole("button", { name: /좋아요/ }).first().click();
  await Promise.all([
    page.waitForURL(/\/oauth2\/authorization\/google$/),
    sheet(page, "좋아요를 누르려면 로그인하세요").getByRole("button", { name: "Google 계정으로 로그인" }).click(),
  ]);
  const next = (await page.context().cookies()).find((c) => c.name === "kurl_login_next");
  expect(decodeURIComponent(next?.value ?? "")).toContain(POST);
});

test("로그인 전용 탭과 화면은 같은 빈 상태 하나로 말한다", async ({ page }) => {
  await page.goto("/ko/blog/notifications");
  await expect(page.getByRole("heading", { name: "알림을 보려면 로그인하세요" })).toBeVisible();

  await page.goto("/ko/blog/notes?feed=following");
  await expect(page.getByRole("heading", { name: "팔로우한 사람의 노트를 보려면 로그인하세요" })).toBeVisible();

  await page.goto("/ko/dashboard");
  const empty = page.getByTestId("sign-in-empty");
  await expect(empty.getByRole("heading", { name: "내 링크를 보려면 로그인하세요" })).toBeVisible();
  await expect(empty.locator("a, li")).toHaveCount(0);
});
