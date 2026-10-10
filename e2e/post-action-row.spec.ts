import { expect, test, type Page } from "@playwright/test";

// mock-on 레인: 목 세션은 @dohyun 이라 dohyun 의 글은 내 글, haruka 의 글은 남의 글이다.
const MINE = "/ko/p/dohyun/nextjs-14-app-router-blog";
const THEIRS = "/ko/p/haruka/hexagonal-too-much";

const header = (page: Page) => page.locator("article header").first();
const row = (page: Page) => header(page).locator("[data-post-action-row]");
const dock = (page: Page) => page.getByTestId("post-dock");
const names = (buttons: ReturnType<Page["locator"]>) =>
  buttons.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));

test.describe("1100px 이상", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("머리는 좋아요 · 저장 · 엮기 · 공유 · ⋯ 한 줄이고, 다섯 모두 이름과 툴팁이 있는 36px 높이의 아이콘 버튼이다", async ({
    page,
  }) => {
    await page.goto(THEIRS);
    const buttons = row(page).getByRole("button");
    await expect(buttons).toHaveCount(5, { timeout: 30_000 });
    expect(await names(buttons)).toEqual([
      expect.stringMatching(/글 좋아요$/),
      "북마크에 저장",
      expect.stringMatching(/컬렉션에 엮기$/),
      "공유",
      "글 메뉴",
    ]);
    for (const [i, button] of (await buttons.all()).entries()) {
      const box = (await button.boundingBox())!;
      expect(Math.round(box.height)).toBe(36);
      await expect(button).toHaveAttribute("title", /.+/);
      if (i === 0) continue;
      expect(Math.round(box.width)).toBe(36);
      await expect(button).toHaveText("");
    }
    await expect(dock(page)).toBeHidden();
  });

  test("좋아요는 하트 옆에 수를 보이고, 누르면 머리와 글 끝의 수가 함께 바뀐다", async ({ page }) => {
    await page.goto(THEIRS);
    const top = row(page).getByRole("button", { name: /글 좋아요$/ });
    const end = page.getByTestId("post-actions").getByRole("button", { name: /글 좋아요$/ });
    await expect(top).toHaveText(/^\d+$/, { timeout: 30_000 });
    await top.click();
    await expect(top).toHaveAttribute("aria-pressed", "true");
    const after = (await top.textContent())!;
    expect(after).toMatch(/^\d+$/);
    await expect(end).toHaveText(after);
    await expect(end).toHaveAttribute("aria-pressed", "true");
  });

  test("글 끝 줄은 머리와 같은 다섯 버튼이다", async ({ page }) => {
    await page.goto(THEIRS);
    await expect(row(page).getByRole("button")).toHaveCount(5, { timeout: 30_000 });
    const end = page.getByTestId("post-actions").getByRole("button");
    await expect(end).toHaveCount(5);
    expect(await names(end)).toEqual(await names(row(page).getByRole("button")));
  });

  test("내 글은 ⋯ → 삭제 → 확인을 거쳐야 지워지고, 지우면 내 홈으로 간다", async ({ page }) => {
    await page.goto(MINE);
    const menu = header(page).getByRole("button", { name: "글 메뉴", exact: true });
    await menu.click({ timeout: 30_000 });
    await expect(page.getByRole("menuitem")).toHaveText(["수정", "삭제", "노트로 인용"]);
    await expect(page.getByRole("menuitem", { name: "수정" })).toHaveAttribute("href", /\/write\/\d+$/);

    await page.getByRole("menuitem", { name: "삭제" }).click();
    const confirm = page.getByRole("dialog", { name: "이 글을 삭제할까요?" });
    await expect(confirm).toContainText("삭제하면 되돌릴 수 없어요.");
    await confirm.getByRole("button", { name: "취소" }).click();
    await expect(confirm).toHaveCount(0);
    await expect(page).toHaveURL(/\/nextjs-14-app-router-blog$/);

    await menu.click();
    await page.getByRole("menuitem", { name: "삭제" }).click();
    await page.getByRole("dialog", { name: "이 글을 삭제할까요?" }).getByRole("button", { name: "삭제" }).click();
    await page.waitForURL(/\/p\/dohyun$/);
  });
});

test.describe("세로 태블릿 820", () => {
  test.use({ viewport: { width: 820, height: 1180 } });

  test("독이 목차 · 엮기 · 좋아요 · 북마크를 들고, 머리엔 팔로우와 ⋯만 남으며, 떠 있던 목차 버튼은 없다", async ({ page }) => {
    await page.goto(MINE);
    await expect(dock(page)).toBeVisible({ timeout: 30_000 });
    await expect(dock(page)).not.toHaveAttribute("data-away", "true");
    expect(await names(dock(page).getByRole("button"))).toEqual([
      "목차",
      expect.stringMatching(/컬렉션에 엮기$/),
      expect.stringMatching(/글 좋아요$/),
      "북마크에 저장",
    ]);
    await expect(page.getByRole("button", { name: "목차" })).toHaveCount(1);
    await expect(page.getByTestId("post-actions")).toBeHidden();

    await page.goto(THEIRS);
    const visible = header(page).locator("[data-post-actions]").getByRole("button");
    await expect(visible).toHaveCount(2, { timeout: 30_000 });
    await expect(visible.first()).toHaveText(/팔로우/);
    await expect(visible.last()).toHaveAccessibleName("글 메뉴");
  });
});
