import { expect, test } from "@playwright/test";

// Mock lane: the inbox carries grouped likes and highlights on a post, a liked comment, a note that
// quoted a post and a post that quoted a note — the post side reads like the note side.
test.use({ viewport: { width: 1280, height: 900 } });

test("post notices group and quote the way note notices do, and open their spot", async ({ page }) => {
  await page.goto("/ko/blog/notifications");
  const main = page.locator("main");
  await expect(main.getByRole("link", { name: /minji님 외 2명이 내 글을 좋아해요/ })).toHaveAttribute(
    "href",
    /\/p\/dohyun\/typescript-generics$/,
    { timeout: 30_000 },
  );
  await expect(main.getByRole("link", { name: /yuna님 외 1명이 내 글에 하이라이트를 남겼어요/ })).toHaveAttribute(
    "href",
    /\/p\/dohyun\/typescript-generics\?highlightId=7&thread=1$/,
  );
  await expect(main.getByRole("link", { name: /haruki님이 내 댓글을 좋아해요/ })).toHaveAttribute(
    "href",
    /\/p\/dohyun\/typescript-generics#comment-3$/,
  );
  await expect(main.getByRole("link", { name: /yuna님이 노트에서 내 글을 인용했어요, 제네릭은/ })).toHaveAttribute(
    "href",
    /\/p\/yuna\/notes\/6$/,
  );
  await expect(
    main.getByRole("link", { name: /kazuki님이 글에서 내 노트를 인용했어요, 이번 주 노트 모음/ }),
  ).toHaveAttribute("href", /\/p\/kazuki\/weekly-notes$/);
});

test("settings pair what happens to a post with what happens to a note", async ({ page }) => {
  await page.goto("/ko/blog/settings");
  const headings = page.getByRole("heading", { level: 3 });
  await expect(headings.filter({ hasText: /^내 글$/ })).toBeVisible({ timeout: 30_000 });
  await expect(headings.filter({ hasText: /^(내 글|내 노트|대화|사람|구독한 소식)$/ })).toHaveText([
    "내 글",
    "내 노트",
    "대화",
    "사람",
    "구독한 소식",
  ]);
  const posts = page.locator("div").filter({ has: page.getByRole("heading", { name: "내 글", exact: true }) }).last();
  await expect(posts.getByRole("switch", { name: "내 글 인용", exact: true })).toHaveAttribute("aria-checked", "true");
  const notes = page.locator("div").filter({ has: page.getByRole("heading", { name: "내 노트", exact: true }) }).last();
  await expect(notes.getByRole("switch", { name: "글에 실린 내 노트", exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});
