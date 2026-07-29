import { expect, test } from "@playwright/test";
import { signInAs, uniqueEmail } from "./helpers/auth";

test.describe("event registration flow", () => {
  test("organizer creates event, anonymous visitor registers and cancels", async ({
    page,
    context,
    browser,
  }) => {
    await signInAs(page, context, uniqueEmail("ev-org"));

    await page.goto("/ko/events/new");
    await page.getByLabel("제목", { exact: false }).fill("E2E 테스트 스터디");
    await page.locator("#ef-starts").fill("2030-01-15T19:00");
    await page.locator("#ef-cap").fill("5");
    await page.getByRole("button", { name: "발행하기" }).click();

    await expect(page.getByText("모집 페이지가 발행됐어요", { exact: false })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole("heading", { name: "E2E 테스트 스터디" })).toBeVisible();

    const publicHref = await page
      .getByRole("link", { name: "공개 페이지 보기" })
      .getAttribute("href");
    expect(publicHref).toBeTruthy();
    const publicPath = new URL(publicHref!).pathname;

    // 참가자는 완전 비로그인 — 새 브라우저 컨텍스트.
    const anonContext = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const anonPage = await anonContext.newPage();
    await anonPage.goto(publicPath);

    await expect(anonPage.getByRole("heading", { name: "E2E 테스트 스터디" })).toBeVisible();
    await expect(anonPage.getByText(/남은 자리/)).toBeVisible();

    await anonPage.locator("#ev-name").fill("참가자");
    await anonPage.locator("#ev-contact").fill(uniqueEmail("guest"));
    await anonPage.getByRole("checkbox").check();
    await anonPage.getByRole("button", { name: "신청하기" }).click();

    await expect(anonPage.getByText("신청 완료!")).toBeVisible({ timeout: 15000 });
    await expect(anonPage.getByText(/나도 모집 페이지 만들기/)).toBeVisible();

    // 취소 링크 복사 → 취소 플로우.
    await anonPage.getByRole("button", { name: "취소 링크 복사" }).click();
    const cancelUrl = await anonPage.evaluate(() => navigator.clipboard.readText());
    expect(cancelUrl).toContain("?cancel=");

    await anonPage.goto(new URL(cancelUrl).pathname + new URL(cancelUrl).search);
    await expect(anonPage.getByText("신청 취소", { exact: false }).first()).toBeVisible();
    await anonPage.getByRole("button", { name: "신청 취소하기" }).click();
    await expect(anonPage.getByText("취소되었어요")).toBeVisible({ timeout: 15000 });

    // 주최자 대시보드에 취소 상태 반영.
    await page.reload();
    await expect(page.getByText("신청자 0명")).toBeVisible({ timeout: 15000 });

    await anonContext.close();
  });

  test("closed event hides the form", async ({ page, context, browser }) => {
    await signInAs(page, context, uniqueEmail("ev-org2"));

    await page.goto("/ko/events/new");
    await page.getByLabel("제목", { exact: false }).fill("마감 테스트");
    await page.locator("#ef-starts").fill("2030-02-01T10:00");
    await page.getByRole("button", { name: "발행하기" }).click();
    await expect(page.getByRole("heading", { name: "마감 테스트" })).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole("button", { name: "신청 마감하기" }).click();
    await expect(page.getByText("변경했어요")).toBeVisible();

    const publicHref = await page
      .getByRole("link", { name: "공개 페이지 보기" })
      .getAttribute("href");
    const anonContext = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
    });
    const anonPage = await anonContext.newPage();
    await anonPage.goto(new URL(publicHref!).pathname);
    await expect(anonPage.getByText("신청이 마감되었어요.")).toBeVisible();
    await expect(anonPage.locator("#ev-name")).toHaveCount(0);
    await anonContext.close();
  });
});
