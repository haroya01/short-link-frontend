import { test, expect } from "@playwright/test";

/**
 * Notes in MOCK-ON: the in-memory note mock serves @dohyun's and @yuna's notes, and the mock session
 * is always @dohyun. Covers the workspace (first-note notice → post), the public notes tab, and a
 * note page with its reply.
 */
test.use({ viewport: { width: 1280, height: 900 } });

test("the first note asks about federation once, then posts to the top of the feed", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const composer = page.getByRole("textbox", { name: "지금 떠오른 생각을 짧게 남겨 보세요" });
  await expect(composer).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("오늘 쓴 글의 씨앗")).toBeVisible();

  await composer.fill("e2e에서 쓴 노트 https://kurl.me/about.");
  await expect(page.getByText("33/500")).toBeVisible();
  await page.getByRole("button", { name: "올리기" }).click();

  const notice = page.getByRole("dialog");
  await expect(notice).toContainText("노트는 다른 서버에도 전해져요");
  await notice.getByRole("button", { name: "알겠어요, 올릴게요" }).click();

  const posted = page.locator("article").first();
  await expect(posted).toContainText("e2e에서 쓴 노트");
  await expect(posted.getByRole("link", { name: "https://kurl.me/about" })).toHaveAttribute(
    "href",
    "https://kurl.me/about",
  );
  await expect(composer).toHaveValue("");

  await composer.fill("두 번째 노트");
  await page.getByRole("button", { name: "올리기" }).click();
  await expect(page.locator("article").first()).toContainText("두 번째 노트");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a blog post opens the composer with the post quoted", async ({ page }) => {
  await page.goto(
    "/ko/blog/notes?quote=5&quoteTitle=" +
      encodeURIComponent("타입스크립트 제네릭이 어려운 이유") +
      "&quoteSlug=typescript-generics&quoteAuthor=dohyun",
  );
  await expect(page.getByText("인용한 글")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "인용 빼기" }).click();
  await expect(page.getByText("인용한 글")).toHaveCount(0);
});

test("the public notes tab lists the author's notes and a note page shows its replies", async ({ page }) => {
  await page.goto("/ko/p/dohyun/notes");
  await expect(page.getByRole("link", { name: "노트" }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("블로그 글을 인용해 봤어요.")).toBeVisible();
  await expect(page.getByAltText("비 오는 창밖")).toBeVisible();
  await expect(page.getByRole("link", { name: /타입스크립트 제네릭이 어려운 이유/ })).toBeVisible();

  await page.goto("/ko/p/yuna/notes/3");
  await expect(page.getByText("오늘 쓴 글의 씨앗")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "답글" })).toBeVisible();
  await expect(page.getByText("좋은 생각이에요")).toBeVisible();
});
