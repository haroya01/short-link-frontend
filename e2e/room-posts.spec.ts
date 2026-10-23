import { expect, test, type Page } from "@playwright/test";
import { openHome } from "./helpers/home";

// Mock-on lane: signed in as @dohyun. Rooms carry blog posts too (iOS MockRooms room-posts scene):
// 동아리 사람들 has yuki_dev's "비 오던 엠티의 밤" with three comments, 대학 동기 "졸업 앨범을 받은 날",
// 우리 가족 "엄마 김치 레시피 받아 적기". 민지's newest note in 동아리 사람들 has two replies.
test.use({ viewport: { width: 390, height: 844 } });

async function openRoom(page: Page, id = 1) {
  await page.goto(`/ko/blog/rooms/${id}`);
  await expect(page.getByTestId("room-timeline").locator("[data-room-item]").first()).toBeVisible({ timeout: 30_000 });
}

test("a room mixes its notes and blog posts newest first, and a room post has no share", async ({ page }) => {
  await openRoom(page);
  const items = page.locator("[data-room-item]");
  await expect(items.nth(0)).toHaveAttribute("data-room-item", "note-9910");
  await expect(items.nth(2)).toHaveAttribute("data-room-item", "post-8801");
  const post = page.locator('[data-room-item="post-8801"]');
  await expect(post).toContainText("비 오던 엠티의 밤");
  await expect(post.getByRole("button", { name: "좋아요", exact: true })).toBeVisible();
  await expect(post.getByRole("button", { name: "북마크", exact: true })).toBeVisible();
  await expect(post.getByRole("button", { name: "공유" })).toHaveCount(0);
  await expect(post.locator("[data-note-room]")).toHaveCount(0);
});

test("comments show under an item, two in the room with the rest behind 모두 보기 that opens the post", async ({ page }) => {
  await openRoom(page);
  const noteReplies = page.locator('[data-room-item="note-9910"] [data-room-replies]');
  await expect(noteReplies.locator("[data-room-reply]")).toHaveCount(2);
  await expect(noteReplies).toContainText("준호");
  await expect(noteReplies).toContainText("사진 있으면 올려 줘요");
  await expect(noteReplies).not.toContainText("모두 보기");

  const postReplies = page.locator('[data-room-item="post-8801"] [data-room-replies]');
  await expect(postReplies).toContainText("단체 사진 진짜 한 장도 없는 거 실화냐");
  await expect(postReplies).toContainText("댓글 3개 모두 보기");
  await expect(postReplies).toHaveAttribute("href", /rainy-mt-night#comments$/);
});

test("방별 shows one comment per item and 전체 shows none", async ({ page }) => {
  await page.goto("/ko/blog/rooms");
  const block = page.locator('[data-room-block="1"]');
  await expect(block.locator("[data-room-replies]").first()).toBeVisible({ timeout: 30_000 });
  await expect(block.locator('[data-room-item="note-9910"] [data-room-reply]')).toHaveCount(1);
  await page.getByRole("tab", { name: "전체" }).click();
  await expect(page.getByTestId("rooms-all").locator("[data-rooms-all-item]").first()).toBeVisible();
  await expect(page.getByTestId("rooms-all").locator("[data-room-replies]")).toHaveCount(0);
});

test("the room's 글 button opens the editor already set to that room", async ({ page }) => {
  await openRoom(page);
  await page.locator("[data-room-write]").click();
  await expect(page).toHaveURL(/\/write\/new\?room=1$/, { timeout: 30_000 });
  await expect(page.locator("[data-editor-room]")).toHaveText("동아리 사람들 멤버만 읽는 글", { timeout: 30_000 });
});

test.describe("publish settings of a room post", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("pick the room, hide the country limit and drop the required tag", async ({ page }) => {
    await page.goto("/ko/blog/write/new?room=1");
    await expect(page.locator("[data-editor-room]")).toHaveText("동아리 사람들 멤버만 읽는 글", { timeout: 30_000 });
    await page.locator('textarea[autocomplete="off"]').first().fill("엠티 사진 정리");
    await page.getByRole("button", { name: "발행" }).first().click();
    const section = page.getByTestId("audience-section");
    await expect(section.getByRole("radio", { name: "동아리 사람들" })).toHaveAttribute("aria-checked", "true");
    await expect(section).toContainText("이 방 멤버만 읽어요. 검색·인기·다른 서버에는 안 떠요.");
    await expect(section.getByRole("group", { name: "국가 제한" })).toHaveCount(0);
    await section.getByRole("radio", { name: "전체" }).click();
    await expect(section.getByRole("group", { name: "국가 제한" })).toBeVisible();
  });
});

test("on 홈, a room post carries its room line, which opens the room", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-home-rooms", "1"));
  await page.goto("/ko/blog?sort=following");
  const post = page.locator('[data-post-id="8801"]');
  await expect(post.locator("[data-note-room]")).toHaveText("동아리 사람들 방에서", { timeout: 30_000 });
  await expect(post.getByRole("button", { name: "공유" })).toHaveCount(0);
  await post.locator("[data-note-room]").click();
  await expect(page).toHaveURL(/\/rooms\/1$/);
});

test("글쓰기 asks where first, always from 모두에게, and a note for a room lands in that room", async ({ page }) => {
  await openHome(page);
  const trigger = page.locator('header.vt-app-header [data-compose-trigger="mobile"]');
  await trigger.click({ timeout: 30_000 });
  const sheet = page.getByRole("dialog", { name: "글쓰기" });
  const where = sheet.getByRole("radiogroup", { name: "어디에" });
  await expect(where.getByRole("radio", { name: "모두에게" })).toHaveAttribute("aria-checked", "true");
  await expect(sheet.locator('[data-compose-choice="longform"]')).toHaveAttribute("href", /\/write\/new$/);
  await where.getByRole("radio", { name: "우리 가족" }).click();
  await expect(sheet.locator('[data-compose-choice="longform"]')).toHaveAttribute("href", /\/write\/new\?room=5$/);
  await expect(sheet.locator('[data-compose-choice="longform"]')).toContainText("방 멤버만 읽는 블로그 글");
  await sheet.locator('[data-compose-choice="note"]').click();

  const dialog = page.getByRole("dialog", { name: "새 노트" });
  await dialog.getByRole("textbox").first().fill("가족한테 한 줄");
  await expect(dialog.locator("[data-note-room-audience]")).toHaveText("우리 가족 멤버만 볼 수 있어요");
  await dialog.getByRole("button", { name: "우리 가족에 올리기" }).click();
  await expect(page).toHaveURL(/\/rooms\/5$/, { timeout: 30_000 });
  await expect(page.locator("[data-room-item]").first()).toContainText("가족한테 한 줄");

  await page.locator('header.vt-app-header [data-compose-trigger="mobile"]').click();
  await expect(
    page.getByRole("dialog", { name: "글쓰기" }).getByRole("radio", { name: "모두에게" }),
  ).toHaveAttribute("aria-checked", "true");
});

test("a note posted in a room lands with the same arrival as on 홈", async ({ page }) => {
  await openRoom(page);
  await page.getByRole("textbox", { name: "지금 뭐 하고 있어요?" }).fill("도착 연출 확인");
  await page.getByRole("button", { name: "동아리 사람들에 올리기" }).click();
  const first = page.locator("[data-room-item]").first();
  await expect(first).toContainText("도착 연출 확인");
  await expect(first.locator("article.note-arrive")).toHaveCount(1);
});

test("leaving with my words deleted says what goes", async ({ page }) => {
  await page.goto("/ko/blog/rooms/2/settings");
  await page.getByRole("button", { name: "방 나가기" }).click({ timeout: 30_000 });
  const dialog = page.getByRole("dialog", { name: "방에서 나갈까요?" });
  await expect(dialog.locator("[data-leave-delete-hint]")).toHaveCount(0);
  await dialog.getByLabel("내 글 삭제하고 나가기").check();
  await expect(dialog.locator("[data-leave-delete-hint]")).toHaveText(
    "삭제하면 이 방에 올린 내 노트·블로그 글·댓글이 모두 사라져요.",
  );
});

test("pressing 홈 on 홈 asks 최신 again from the start, with what is new on top", async ({ page }) => {
  await openHome(page);
  const feed = page.getByTestId("home-feed");
  const mine = feed.locator("article[data-note-id]:not([data-remote-kept] article)");
  await expect(mine.first()).toBeVisible({ timeout: 30_000 });
  const before = await mine.count();
  await page.locator("nav.vt-bottom-nav").getByRole("link", { name: "홈" }).click();
  await expect(mine.first()).toContainText("방금 올라온 노트");
  await expect(mine).toHaveCount(before + 1);
  expect(await page.evaluate(() => (globalThis as { __kurlHomeReload?: number }).__kurlHomeReload)).toBe(1);
});
