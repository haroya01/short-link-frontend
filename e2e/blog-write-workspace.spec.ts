import { expect, test, type Page } from "@playwright/test";
import { expectOnTop, toastBy } from "./helpers/on-top";

// mock-on 레인: 작성 목의 7002 는 주소 mock-draft 를 쓰는 임시저장 글이다.
async function openList(page: Page) {
  await page.goto("/ko/blog/write");
  await expect(page.getByRole("button", { name: ".md 가져오기" })).toBeVisible({ timeout: 30_000 });
}

const md = (title: string, slug: string) => Buffer.from(`---\ntitle: ${title}\nslug: ${slug}\n---\n옮겨 온 본문\n`);

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("닫힌 서랍은 화면 왼쪽 가장자리에 그림자를 남기지 않고, 열리면 그림자를 드리운다", async ({ page }) => {
    await openList(page);
    const drawer = page.locator('[role="dialog"][aria-label="메뉴"]');
    const shadow = () => drawer.evaluate((el) => getComputedStyle(el).boxShadow);
    await expect.poll(shadow).toBe("none");

    await page.getByRole("button", { name: "메뉴 열기" }).click();
    await expect.poll(shadow).not.toBe("none");
  });
});

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("예전 시리즈 주소는 글 목록의 시리즈별 보기로 연다", async ({ page }) => {
    await page.goto("/ko/blog/series");
    await page.waitForURL(/\/ko\/blog\/write\?view=series$/, { timeout: 30_000 });
    await expect(page.getByRole("button", { name: "시리즈별" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "새 시리즈" })).toBeVisible();
  });

  test(".md 가져오기는 몇 편을 가져왔는지 알리고, 아무도 안 쓰는 frontmatter 주소는 그대로 쓰고 겹치는 주소는 새로 뽑는다", async ({ page }) => {
    await openList(page);
    await page.locator('input[type="file"][accept*=".md"]').setInputFiles([
      { name: "moved.md", mimeType: "text/markdown", buffer: md("벨로그에서 옮긴 글", "velog-moved-post") },
      { name: "clash.md", mimeType: "text/markdown", buffer: md("주소가 겹친 글", "mock-draft") },
    ]);
    await expectOnTop(toastBy(page, "2편을 가져왔어요"));

    const address = page.getByRole("dialog", { name: /발행 설정/ }).locator("button[aria-expanded]");
    await page.getByRole("link", { name: /^임시저장 벨로그에서 옮긴 글/ }).click();
    await expect(page.locator(".tiptap")).toContainText("옮겨 온 본문", { timeout: 30_000 });
    await page.getByRole("button", { name: "발행", exact: true }).click();
    await expect(address).toHaveText(/\/velog-moved-post$/);

    await page.goBack();
    await page.getByRole("link", { name: /^임시저장 주소가 겹친 글/ }).click();
    await expect(page.locator(".tiptap")).toContainText("옮겨 온 본문", { timeout: 30_000 });
    await page.getByRole("button", { name: "발행", exact: true }).click();
    await expect(address).toHaveText(/\/draft-[a-z0-9]+$/);
  });
});
