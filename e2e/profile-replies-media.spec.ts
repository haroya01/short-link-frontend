import { expect, test } from "@playwright/test";

// mock-on 레인: dohyun 은 yuna 의 노트 3에 답글(4)을 달았고, 부모가 사라진 답글(990)도 있다.
// yuna 의 첨부 노트는 사진 세 장짜리 5와 민감 표시된 8이다. haruka 는 사진이 없고 sora 는 남에게 단 답글이 없다.
test.use({ viewport: { width: 1280, height: 900 } });

const tabs = (page: import("@playwright/test").Page) => page.locator("nav:has([data-tab])").locator("[data-tab]");

test("프로필 탭은 글 · 노트 · 답글 · 미디어 · 리포스트 순서다", async ({ page }) => {
  await page.goto("/ko/p/dohyun");
  await expect(tabs(page).first()).toBeVisible({ timeout: 30_000 });
  await expect(tabs(page)).toHaveText(["글", "노트", "답글", "미디어", "리포스트", "시리즈", "컬렉션", "소개"]);
});

test("답글 탭은 누구에게 단 답글인지 한 줄로 말하고, 그 줄만 원래 글로 간다", async ({ page }) => {
  await page.goto("/ko/p/dohyun/replies");
  await expect(tabs(page).filter({ hasText: "답글" })).toHaveAttribute("aria-current", "page", { timeout: 30_000 });
  const reply = page.locator('article[data-note-id="4"]');
  const context = reply.getByTestId("reply-context");
  await expect(context).toContainText("@yuna 님에게 답글 · 오늘 쓴 글의 씨앗");
  await expect(reply.getByRole("button", { name: "좋아요" })).toBeVisible();

  const orphan = page.locator('article[data-note-id="990"]');
  await expect(orphan.getByTestId("reply-context")).toHaveText("원래 글을 볼 수 없어요");
  await expect(orphan.getByTestId("reply-context").locator("a")).toHaveCount(0);

  await context.getByRole("link").click();
  await expect(page).toHaveURL(/\/p\/yuna\/notes\/3$/, { timeout: 30_000 });
});

test("미디어 탭은 3열 정사각 격자이고, 여러 장이면 개수를, 민감하면 흐림을 보이며 누르면 노트로 간다", async ({ page }) => {
  await page.goto("/ko/p/yuna/media");
  const grid = page.getByTestId("media-grid");
  await expect(grid).toBeVisible({ timeout: 30_000 });
  expect(await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(3);

  const multi = grid.locator('[data-media-cell="5"]');
  await expect(multi.locator("[data-media-count]")).toHaveText("3");
  const box = (await multi.boundingBox())!;
  expect(Math.abs(box.width - box.height)).toBeLessThan(2);

  const sensitive = grid.locator('[data-media-cell="8"]');
  await expect(sensitive).toHaveAttribute("data-sensitive", "true");
  await expect(sensitive).toHaveAttribute("aria-label", /민감한 내용/);
  await expect(sensitive.locator("img")).toHaveClass(/blur-xl/);

  await multi.click();
  await expect(page).toHaveURL(/\/p\/yuna\/notes\/5$/, { timeout: 30_000 });
});

test("빈 답글·미디어 탭은 한 줄로 말한다", async ({ page }) => {
  await page.goto("/ko/p/haruka/media");
  await expect(page.getByText("아직 올린 사진이 없어요")).toBeVisible({ timeout: 30_000 });
  await page.goto("/ko/p/sora/replies");
  await expect(page.getByText("아직 단 답글이 없어요")).toBeVisible({ timeout: 30_000 });
});

test("휴대폰에선 넘치는 탭 줄의 가장자리가 흐려지고, 고른 탭이 보이는 자리로 온다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko/p/dohyun/media");
  const nav = page.locator("nav:has([data-tab])");
  const active = nav.locator('[data-tab][aria-current="page"]');
  await expect(active).toHaveText("미디어", { timeout: 30_000 });
  await expect(nav).toHaveAttribute("data-edge-end", "true");
  await expect(async () => {
    const n = (await nav.boundingBox())!;
    const a = (await active.boundingBox())!;
    expect(a.x).toBeGreaterThanOrEqual(n.x - 1);
    expect(a.x + a.width).toBeLessThanOrEqual(n.x + n.width + 1);
  }).toPass();
});
