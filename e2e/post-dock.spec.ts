import { expect, test, type Page } from "@playwright/test";

// mock-on 레인: 휴대폰(<640px)에선 글 동작(목차·엮기·좋아요·북마크)이 오른쪽 아래 떠 있는 독으로 가고,
// 데스크톱은 헤더 줄을 그대로 쓴다.
const POST = "/ko/p/dohyun/nextjs-14-app-router-blog";
const PHONE = { width: 390, height: 844 };

const dock = (page: Page) => page.getByTestId("post-dock");

test("휴대폰은 헤더 대신 독에 목차·엮기·좋아요·북마크가 있고, 데스크톱은 헤더 줄 그대로다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(POST);
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await expect(dock(page).getByRole("button")).toHaveText(["", "", "", ""]);
  await expect(dock(page).getByRole("button", { name: "목차" })).toBeVisible();
  await expect(dock(page).getByRole("button", { name: /컬렉션이나 길에 엮기$/ })).toBeVisible();
  await expect(dock(page).getByRole("button", { name: /글 좋아요$/ })).toBeVisible();
  await expect(dock(page).getByRole("button", { name: "북마크에 저장" })).toBeVisible();
  const header = page.locator("article header").first();
  await expect(header.getByRole("button", { name: /글 좋아요$/ })).toBeHidden();
  await expect(header.getByRole("button", { name: "북마크에 저장" })).toBeHidden();

  const like = dock(page).getByRole("button", { name: /글 좋아요$/ });
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(dock(page)).toBeHidden();
  await expect(header.getByRole("button", { name: /글 좋아요$/ })).toHaveAttribute("aria-pressed", "true");
  await expect(header.getByRole("button", { name: "북마크에 저장" })).toBeVisible();
});

test("독은 하단 탭 위에 떠 있고, 탭이 내려가면 따라 내려간다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(POST);
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  const nav = page.locator(".vt-bottom-nav");
  await expect(async () => {
    const d = (await dock(page).boundingBox())!;
    const n = (await nav.boundingBox())!;
    expect(d.y + d.height).toBeLessThanOrEqual(n.y - 8);
  }).toPass();

  await page.mouse.wheel(0, 600);
  await expect(nav).toHaveClass(/translate-y-full/);
  await expect(async () => {
    const d = (await dock(page).boundingBox())!;
    expect(PHONE.height - (d.y + d.height)).toBeLessThan(24);
  }).toPass();
});

test("목차 버튼은 제목 시트를 열고, 제목을 고르면 시트가 닫히며 그 자리로 간다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(POST);
  await dock(page).getByRole("button", { name: "목차" }).click({ timeout: 30_000 });
  const sheet = page.getByRole("dialog", { name: "목차" });
  await expect(sheet).toBeVisible();
  const link = sheet.getByRole("link").nth(1);
  const id = (await link.getAttribute("href"))!.slice(1);
  await link.click();
  await expect(sheet).toBeHidden();
  await expect(page.locator(`[id="${id}"]`)).toBeInViewport();
});

test("글 끝에 닿으면 독이 물러나고, 본문으로 올라오면 다시 뜬다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(POST);
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await expect(dock(page)).not.toHaveAttribute("data-away", "true");

  await page.locator("[data-post-end]").scrollIntoViewIfNeeded();
  await expect(dock(page)).toHaveAttribute("data-away", "true");
  await expect(dock(page).getByRole("button", { name: /글 좋아요$/ })).toHaveCount(0);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(dock(page)).not.toHaveAttribute("data-away", "true");
  await expect(dock(page).getByRole("button", { name: /글 좋아요$/ })).toBeVisible();
});

test("아래 붙은 댓글 작성기가 열려 있는 동안 독이 물러난다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(POST);
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await page.locator("#comments").getByRole("button", { name: "답글", exact: true }).first().click();
  await expect(page.locator("[data-testid='conversation-composer'] textarea")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(dock(page)).toHaveAttribute("data-away", "true");

  await page.locator("[data-testid='conversation-composer']").getByRole("button", { name: "닫기" }).click();
  await expect(dock(page)).not.toHaveAttribute("data-away", "true");
});

test("독만큼 글 아래 여백이 있어 마지막 줄이 독에 가리지 않는다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(POST);
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const dockH = document.querySelector("[data-testid=post-dock]")!.getBoundingClientRect().height;
        const padding = parseFloat(getComputedStyle(document.querySelector("article")!).paddingBottom);
        return padding - (dockH + 12);
      }),
    )
    .toBeGreaterThanOrEqual(0);
});

test("휴대폰 헤더의 ⋯에 공유·노트로 인용이 있고, 데스크톱에선 글 끝 동작 줄에 있다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto("/ko/p/haruka/hexagonal-too-much");
  const header = page.locator("article header").first();
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await expect(header.getByRole("button", { name: "공유" })).toBeHidden();
  await expect(page.getByTestId("post-actions")).toBeHidden();
  await header.getByRole("button", { name: "글 메뉴", exact: true }).click();
  await expect(page.getByRole("menuitem")).toHaveText(["공유", "노트로 인용", "차단", "신고"]);
  await page.getByRole("menuitem", { name: "노트로 인용" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload();
  await header.getByRole("button", { name: "글 메뉴", exact: true }).click({ timeout: 30_000 });
  await expect(page.getByRole("menuitem")).toHaveText(["차단", "신고"]);
  const actions = page.getByTestId("post-actions");
  await expect(actions.getByRole("button", { name: "노트로 인용" })).toBeVisible();
  await expect(actions.getByRole("button", { name: "공유" })).toBeVisible();
});

test("내 글도 휴대폰에선 ⋯에서 공유·노트로 인용을 고른다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(POST);
  const header = page.locator("article header").first();
  await header.getByRole("button", { name: "글 메뉴", exact: true }).click({ timeout: 30_000 });
  await expect(page.getByRole("menuitem")).toHaveText(["공유", "노트로 인용"]);
});

test("휴대폰 글 끝은 iOS처럼 태그 → 다음 편 → 작가 카드 → 다음 읽을 글 → 댓글 순서다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(POST);
  await expect(page.getByTestId("post-author-card")).toBeAttached({ timeout: 30_000 });
  const top = async (loc: ReturnType<Page["locator"]>) => (await loc.evaluate((el) => el.getBoundingClientRect().top + window.scrollY));
  const order = [
    await top(page.getByTestId("post-tags")),
    await top(page.getByText("이 시리즈의 다음 편")),
    await top(page.locator("[data-post-end]")),
    await top(page.getByTestId("post-author-card")),
    await top(page.getByRole("heading", { name: "다음 읽을 글" })),
    await top(page.locator("#comments")),
  ];
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  await expect(page.getByTestId("post-author-card").getByRole("link", { name: /@dohyun/ })).toBeVisible();
  await expect(page.locator("article").getByRole("link", { name: "@dohyun님의 다른 글" })).toHaveCount(0);

  await page.goto("/ko/p/haruka/hexagonal-too-much");
  await expect(page.getByTestId("post-author-card").getByRole("button", { name: /팔로우/ })).toBeVisible({ timeout: 30_000 });
});
