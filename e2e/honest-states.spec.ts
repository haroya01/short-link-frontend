import { test, expect, type Page } from "@playwright/test";

/**
 * Screens say what actually happened, in MOCK-ON. `kurl:mock-fail` (comma-separated) makes the named
 * mock reads fail like a 500: notifications, search, saved, highlights, collection. The mock session
 * is @dohyun. The note page renders on the server, whose mock store never sees a note posted in the
 * browser, so "보기" is checked by where it lands.
 */

async function failing(page: Page, names: string) {
  await page.addInitScript((value) => window.localStorage.setItem("kurl:mock-fail", value), names);
}

async function recover(page: Page) {
  await page.evaluate(() => window.localStorage.removeItem("kurl:mock-fail"));
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("unpublishing asks first, and Escape closes only the question", async ({ page }) => {
    await page.goto("/ko/blog/write");
    await page.getByRole("listitem").getByRole("link", { name: /로컬에서 쓴 발행 글/ }).click({ timeout: 30_000 });
    await page.getByRole("button", { name: "글 설정" }).click({ timeout: 30_000 });
    const panel = page.getByRole("dialog", { name: "글 설정" });
    await panel.getByRole("button", { name: "발행 취소", exact: true }).click();

    const ask = page.getByRole("dialog", { name: "이 글의 발행을 취소할까요?" });
    await expect(ask).toContainText("공개 주소가 닫혀 아무도 볼 수 없게 돼요");
    await page.keyboard.press("Escape");
    await expect(ask).toHaveCount(0);
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("button", { name: "발행 취소", exact: true })).toBeFocused();

    await panel.getByRole("button", { name: "발행 취소", exact: true }).click();
    await ask.getByRole("button", { name: "발행 취소", exact: true }).click();
    await expect(panel.getByRole("button", { name: "재발행", exact: true })).toBeVisible({ timeout: 30_000 });
  });

  test("the bell says the list failed and retries, instead of 'no notifications'", async ({ page }) => {
    await failing(page, "notifications");
    await page.goto("/ko/blog");
    await page.getByRole("button", { name: /^알림/ }).click({ timeout: 30_000 });
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("alert")).toContainText("알림을 불러오지 못했어요");
    await expect(menu.getByText("아직 알림이 없어요")).toHaveCount(0);

    await recover(page);
    await menu.getByRole("button", { name: "다시 시도" }).click();
    await expect(menu.getByRole("link").first()).toBeVisible();
    await expect(menu.getByRole("alert")).toHaveCount(0);
  });

  test("the header bell marks unread with a dot and tells the count only to screen readers", async ({ page }) => {
    await page.goto("/ko/blog");
    const bell = page.locator("header.vt-app-header").getByRole("button", { name: /^알림, 안 읽은 알림 \d+개$/ });
    await expect(bell).toBeVisible({ timeout: 30_000 });
    await expect(bell.locator("[data-unread-dot]")).toBeVisible();
    await expect(bell).toHaveText("");
  });

  test("header search says it couldn't search, and retries", async ({ page }) => {
    await failing(page, "search");
    await page.goto("/ko/blog");
    await page.getByRole("searchbox", { name: "검색" }).fill("next", { timeout: 30_000 });
    const panel = page.getByRole("search");
    await expect(panel.getByRole("alert")).toContainText("검색하지 못했어요");
    await expect(panel.getByText("검색 결과가 없어요")).toHaveCount(0);

    await recover(page);
    await panel.getByRole("button", { name: "다시 시도" }).click();
    await expect(panel.getByText("Next.js 14 App Router로 블로그를 다시 만든 이유")).toBeVisible();
  });

  test("saved posts and highlights say they failed to load, each by its own name", async ({ page }) => {
    await failing(page, "saved,highlights");
    await page.goto("/ko/blog/curation");
    await expect(page.getByText("북마크를 불러오지 못했어요.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("북마크한 글이 없어요")).toHaveCount(0);

    await page.getByRole("navigation", { name: "서재", exact: true }).getByRole("link", { name: "하이라이트·공개 메모" }).click();
    await expect(page.getByText("하이라이트를 불러오지 못했어요.")).toBeVisible();
    await expect(page.getByText("읽기 기록을 불러오지 못했어요.")).toHaveCount(0);

    await recover(page);
    await page.getByRole("button", { name: "다시 시도" }).click();
    await expect(page.locator('a[href*="?hl="]').first()).toBeVisible();
  });

  test("a collection that failed to load offers a retry", async ({ page }) => {
    await failing(page, "collection");
    await page.goto("/ko/blog/collections/1");
    await expect(page.getByText("컬렉션을 불러오지 못했어요")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("이 컬렉션을 찾을 수 없어요.")).toHaveCount(0);

    await recover(page);
    await page.getByRole("button", { name: "다시 시도" }).click();
    await expect(page.locator('a[data-bhv-id="note/3"]').first()).toBeVisible({ timeout: 30_000 });
  });

  test("a collection that isn't there still says it's missing", async ({ page }) => {
    await page.goto("/ko/blog/collections/999999");
    await expect(page.getByText("이 컬렉션을 찾을 수 없어요.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "다시 시도" })).toHaveCount(0);
  });

  test("an author is reported from the profile ⋯, titled as a user report", async ({ page }) => {
    await page.goto("/ko/p/minji");
    await expect(page.getByRole("button", { name: "신고", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "프로필 메뉴" }).click({ timeout: 30_000 });
    await expect(page.getByRole("menu").getByRole("menuitem").last()).toHaveText("신고");
    await page.getByRole("menuitem", { name: "신고", exact: true }).click();
    const report = page.getByRole("dialog", { name: "이 사용자 신고" });
    await report.getByLabel("스팸·광고").check();
    await report.getByRole("button", { name: "신고", exact: true }).click();
    await expect(page.getByText("신고가 접수됐어요.").first()).toBeVisible();
  });

  test("a signed-out reader still finds 신고 in the profile ⋯", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-signed-out", "1"));
    await page.goto("/ko/p/minji");
    await page.getByRole("button", { name: "프로필 메뉴" }).click({ timeout: 30_000 });
    await expect(page.getByRole("menu").getByRole("menuitem")).toHaveText(["신고"]);
  });

  test("a comment report is titled as a comment report", async ({ page }) => {
    await page.goto("/ko/p/haruka/hexagonal-too-much");
    const minji = page.locator("#comment-1");
    await minji.getByRole("button", { name: "댓글 메뉴" }).first().click({ timeout: 30_000 });
    await page.getByRole("menuitem", { name: "신고", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "이 댓글 신고" })).toBeVisible();
  });

  test("search results drop 팔로잉 and say nothing matched without a broken particle", async ({ page }) => {
    await page.goto("/ko/blog?q=%EC%9A%B0%EC%A3%BC%EC%84%A0");
    const tabs = page.locator('header[data-feed-switcher="blog"]').getByRole("navigation").getByRole("link");
    await expect(tabs).toHaveText(["최신", "인기", "노트", "사람"], { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("‘우주선’ 검색 결과");
    await expect(page.getByRole("heading", { level: 2, name: "맞는 글이 없어요" })).toBeVisible();

    await tabs.filter({ hasText: "노트" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "맞는 노트가 없어요" })).toBeVisible({ timeout: 30_000 });
  });

  test("a subscribed series reads 구독 중", async ({ page }) => {
    await page.goto("/ko/p/dohyun/series/nextjs-deep-dive");
    const subscribe = page.getByRole("button", { name: "구독", exact: true });
    await subscribe.click({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "구독 중", exact: true })).toBeVisible();
  });

  test("a note posted from the header toasts with 보기, which opens it", async ({ page }) => {
    await page.goto("/ko/blog");
    await page.locator('header.vt-app-header [data-compose-trigger="desktop"]').click({ timeout: 30_000 });
    await page.getByRole("menuitem", { name: /노트/ }).click();
    const dialog = page.getByRole("dialog", { name: "새 노트" });
    await dialog.getByRole("textbox").first().fill("피드에서 쓰고 바로 보러 가는 노트");
    await dialog.getByRole("button", { name: "올리기" }).click();
    await page.getByRole("dialog").filter({ hasText: "노트는 다른 서버에도 전해져요" }).getByRole("button", { name: "알겠어요, 올릴게요" }).click();

    const toast = page.getByRole("status").filter({ hasText: "노트를 올렸어요" });
    await toast.hover();
    await page.waitForTimeout(5_000);
    await expect(toast).toBeVisible();
    await toast.getByRole("button", { name: "보기" }).click();
    await page.waitForURL(/\/dohyun\/notes\/\d+$/, { timeout: 30_000 });
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the bottom-nav 알림 marks unread with a dot and tells the count only to screen readers", async ({ page }) => {
    await page.goto("/ko/blog");
    const tab = page.locator("nav.vt-bottom-nav").getByRole("link", { name: /^알림, 안 읽은 알림 \d+개$/ });
    await expect(tab).toBeVisible({ timeout: 30_000 });
    await expect(tab.locator("[data-unread-dot]")).toBeVisible();
    await expect(tab).toHaveText("알림");
  });

  test("the search sheet says it couldn't search, and retries", async ({ page }) => {
    await failing(page, "search");
    await page.goto("/ko/blog");
    await page.locator("nav").getByText("검색", { exact: true }).last().click({ timeout: 30_000 });
    const sheet = page.getByRole("dialog", { name: "검색" });
    await sheet.getByRole("searchbox").fill("next");
    await expect(sheet.getByRole("alert")).toContainText("검색하지 못했어요");

    await recover(page);
    await sheet.getByRole("button", { name: "다시 시도" }).click();
    await expect(sheet.getByText("Next.js 14 App Router로 블로그를 다시 만든 이유")).toBeVisible();
  });
});

test.describe("narrow phone", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("a long toast wraps onto a second line instead of being cut", async ({ page }) => {
    await page.goto("/ko/p/minji");
    await page.getByRole("button", { name: "프로필 메뉴" }).click({ timeout: 30_000 });
    await page.getByRole("menuitem", { name: "차단", exact: true }).click();
    await page.getByRole("dialog", { name: "minji님을 차단할까요?" }).getByRole("button", { name: "차단", exact: true }).click();

    const text = page.getByRole("status").filter({ hasText: "minji님을 차단했어요" }).locator("span").first();
    await expect(text).toBeVisible();
    const box = await text.evaluate((el) => ({
      cut: el.scrollWidth > el.clientWidth,
      lines: Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)),
    }));
    expect(box.cut).toBe(false);
    expect(box.lines).toBeGreaterThanOrEqual(2);
  });
});
