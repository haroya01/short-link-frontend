import { test, expect, type Locator } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

const typeset = (el: Locator) =>
  el.evaluate((node) => {
    const style = getComputedStyle(node);
    return { lang: node.closest("[lang]")?.getAttribute("lang"), wordBreak: style.wordBreak, font: style.fontFamily };
  });

test("a Korean note on the English feed keeps Korean line breaking", async ({ page }) => {
  await page.goto("/en/blog/notes");
  const body = page.locator("[data-note-body] p").filter({ hasText: "단축 링크가 사라지면" }).first();
  await expect(body).toBeVisible({ timeout: 30_000 });
  expect(await typeset(body)).toMatchObject({ lang: "ko", wordBreak: "keep-all" });
});

test("a Japanese note on the Korean feed breaks by phrase and is set in Pretendard JP", async ({ page }) => {
  const text = "結局のところ大事なのは読者が迷わないことだと気づきました";
  await page.goto("/ko/blog/notes");
  await expect(page.locator('link[rel="stylesheet"][href*="pretendardvariable-jp-dynamic-subset"]')).toHaveCount(1);
  await page.locator('header.vt-app-header [data-compose-trigger="desktop"]').click({ timeout: 30_000 });
  await page.getByRole("menuitem", { name: /노트/ }).click();
  const dialog = page.getByRole("dialog", { name: "새 노트" });
  await dialog.getByRole("textbox").first().fill(text);
  await dialog.getByRole("button", { name: "올리기" }).click();
  await page.getByRole("dialog").filter({ hasText: "노트는 다른 서버에도 전해져요" }).getByRole("button", { name: "알겠어요, 올릴게요" }).click();
  const body = page.locator("[data-note-body] p").filter({ hasText: text }).first();
  await expect(body).toBeVisible();
  const set = await typeset(body);
  expect(set).toMatchObject({ lang: "ja", wordBreak: "auto-phrase" });
  expect(set.font).toMatch(/^"Pretendard JP Variable"/);
});

test("comments, bios and notification excerpts carry their own language on an English page", async ({ page }) => {
  await page.goto("/en/p/dohyun/nextjs-14-app-router-blog");
  await expect(page.locator("#comment-1 [lang]").first()).toHaveAttribute("lang", "ko", { timeout: 30_000 });
  await expect(page.locator("aside p", { hasText: "백엔드 개발자" }).first()).toHaveAttribute("lang", "ko");

  await page.goto("/en/p/dohyun");
  await expect(page.locator("p", { hasText: "백엔드 개발자" }).first()).toHaveAttribute("lang", "ko", { timeout: 30_000 });

  await page.goto("/en/blog/notifications");
  await expect(page.locator("main span[lang]", { hasText: "블로그 글을 인용해 봤어요." }).first()).toHaveAttribute("lang", "ko", {
    timeout: 30_000,
  });
});
