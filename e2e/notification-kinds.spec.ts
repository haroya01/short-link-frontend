import { expect, test } from "@playwright/test";

// Mock lane: the inbox carries grouped likes and highlights on a post, a liked comment, a liked highlight
// reply on sora's post, a note that quoted a post and a post that quoted a note — the post side reads like
// the note side. It also carries a first-reader notice and a 1,000-reader milestone, which have no actor.
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
    /\/p\/dohyun\/typescript-generics#comment-7$/,
  );
  await expect(main.getByRole("link", { name: /haruka님이 하이라이트에 단 내 답글을 좋아해요/ })).toHaveAttribute(
    "href",
    /\/p\/sora\/posthog-funnel\?highlightId=4001&thread=1$/,
  );
  await expect(main.getByRole("link", { name: /haruka님이 내 댓글을 좋아해요/ })).toHaveCount(0);
  await expect(main.getByRole("link", { name: /yuna님이 노트에서 내 글을 인용했어요, 제네릭은/ })).toHaveAttribute(
    "href",
    /\/p\/yuna\/notes\/6$/,
  );
  await expect(
    main.getByRole("link", { name: /kazuki님이 글에서 내 노트를 인용했어요, 이번 주 노트 모음/ }),
  ).toHaveAttribute("href", /\/p\/kazuki\/weekly-notes$/);
});

test("reader notices name no one and open the writer's own post", async ({ page }) => {
  await page.goto("/ko/blog/notifications");
  const main = page.locator("main");
  const milestone = main.getByRole("link", {
    name: "1,000명이 읽었어요, Next.js 14 App Router로 블로그를 다시 만든 이유",
    exact: true,
  });
  await expect(milestone).toHaveAttribute("href", /\/p\/dohyun\/nextjs-14-app-router-blog$/, { timeout: 30_000 });
  const first = main.getByRole("link", { name: "첫 독자가 생겼어요, 리팩터링: 이름 짓기에 하루를 쓰는 이유", exact: true });
  await expect(first).toHaveAttribute("href", /\/p\/dohyun\/naming-things$/);
  for (const link of [milestone, first]) {
    const row = link.locator("xpath=..");
    await expect(row.locator("[data-avatar-tint], img")).toHaveCount(0);
    await expect(row.locator("svg.lucide-user")).toHaveCount(1);
  }
});

test("reader switches sit under the writer's posts and turn off", async ({ page }) => {
  await page.goto("/ko/blog/settings");
  const posts = page.locator("div").filter({ has: page.getByRole("heading", { name: "내 글", exact: true }) }).last();
  const firstReader = posts.getByRole("switch", { name: "첫 독자", exact: true });
  await expect(firstReader).toHaveAttribute("aria-checked", "true", { timeout: 30_000 });
  await expect(posts.getByText("내 글을 처음 읽은 사람이 생길 때", { exact: true })).toBeVisible();
  const readCount = posts.getByRole("switch", { name: "읽은 사람 수", exact: true });
  await expect(readCount).toHaveAttribute("aria-checked", "true");
  await readCount.click();
  await expect(readCount).toHaveAttribute("aria-checked", "false");
  await expect(firstReader).toHaveAttribute("aria-checked", "true");
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

test("a hiding notice filter hides every notice that quotes someone else's note", async ({ page }) => {
  await page.goto("/ko/blog/settings");
  const section = page.getByRole("region", { name: "키워드 필터" });
  await section.getByRole("textbox", { name: "키워드나 문구" }).fill("제네릭은", { timeout: 30_000 });
  await section.getByRole("checkbox", { name: "알림" }).check();
  await section.getByRole("combobox", { name: "걸리면" }).selectOption("hide");
  await section.getByRole("button", { name: "필터 추가" }).click();
  await expect(section.getByRole("button", { name: "제네릭은 필터 고치기" })).toBeVisible();

  await page.goto("/ko/blog/notifications");
  const main = page.locator("main");
  await expect(main.getByRole("link", { name: /minji님 외 2명이 내 글을 좋아해요/ })).toBeVisible({ timeout: 30_000 });
  await expect(main.getByRole("link", { name: /yuna님이 노트에서 내 글을 인용했어요/ })).toHaveCount(0);
});
