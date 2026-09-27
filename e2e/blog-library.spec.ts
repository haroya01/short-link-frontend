import { expect, test } from "@playwright/test";

// Mock-mode reader library: navigation must expose passages directly and preserve source anchors.
test("library switches between saved posts and highlights with browser history", async ({ page }) => {
  await page.goto("/ko/blog/curation");
  await expect(page.getByRole("heading", { level: 1, name: "보관함" })).toBeVisible();
  const library = page.getByRole("navigation", { name: "보관함", exact: true });
  await expect(library.getByRole("link", { name: "저장한 글", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(library.getByRole("link", { name: "컬렉션", exact: true })).toHaveAttribute("href", /\/collections$/);

  await library.getByRole("link", { name: "하이라이트·메모", exact: true }).click();
  await expect(page).toHaveURL(/\/curation\?view=highlights$/);
  await expect(library.getByRole("link", { name: "하이라이트·메모", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("searchbox", { name: "구절, 메모, 글 제목으로 찾기" })).toBeVisible();
  await expect(page.locator('a[href*="?hl="]').first()).toBeVisible();

  await page.goBack();
  await expect(library.getByRole("link", { name: "저장한 글", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("searchbox", { name: "구절, 메모, 글 제목으로 찾기" })).toHaveCount(0);
});

test("mobile account has one library entrance", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko/blog");
  await page.getByRole("button", { name: "계정", exact: true }).click();
  const account = page.getByRole("dialog");
  await expect(account.getByRole("link", { name: "보관함", exact: true })).toBeVisible();
  await expect(account.locator('a[href$="/curation"]')).toHaveCount(1);
  await expect(account.getByRole("link", { name: "내 컬렉션", exact: true })).toBeVisible();
});

for (const locale of ["en", "ja", "vi", "hi"]) {
  test(`library keeps ${locale} when opening highlights`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${locale}/blog/curation`);
    const highlights = page.locator('nav a[href*="view=highlights"]');
    await highlights.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/.*curation\\?view=highlights$`));
    await expect(highlights).toHaveAttribute("aria-current", "page");
    await expect(page.locator('input[type="search"]').last()).toBeVisible();
  });
}
