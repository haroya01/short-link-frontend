import { expect, test, type Page } from "@playwright/test";
import { openHome } from "./helpers/home";
import { expectOnTop, toastBy } from "./helpers/on-top";

// Mock-on lane: signed in as @dohyun, a member of 동아리 사람들 (room 1: notes 9910 민지, 9909 준호, 9908 yuki_dev,
// post 8801 "비 오던 엠티의 밤" which carries note 9908 and 대학 동기's note 9905) and of 대학 동기 (room 2).
// What a room holds is quoted only inside that room; what anyone may see is quoted anywhere.
test.use({ viewport: { width: 390, height: 844 } });

const ROOM_POST = "/ko/p/yuki_dev/rainy-mt-night";
const noteAt = (id: number) => encodeURIComponent(`http://localhost/ko/p/x/notes/${id}`);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:cookie-consent:v1", "accepted"));
});

async function openRoom(page: Page, id = 1) {
  await page.goto(`/ko/blog/rooms/${id}`);
  await expect(page.getByTestId("room-timeline").locator("[data-room-item]").first()).toBeVisible({ timeout: 30_000 });
}

const roomNote = (page: Page, id: number) => page.locator(`article[data-note-id="${id}"]`);

async function openQuoteMenu(page: Page, id: number) {
  await roomNote(page, id).getByRole("button", { name: "인용", exact: true }).click();
  return roomNote(page, id).getByRole("menu");
}

async function openMemberPost(page: Page) {
  await page.goto(ROOM_POST, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("member-post").getByRole("heading", { level: 1, name: "비 오던 엠티의 밤" })).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("a room note", () => {
  test("has a quote menu where repost would be, and nothing that carries it out of the room", async ({ page }) => {
    await openRoom(page);
    const actions = roomNote(page, 9910).locator("footer").getByRole("button");
    await expect(actions).toHaveCount(3);
    await expect(actions.nth(0)).toHaveAccessibleName("좋아요");
    await expect(actions.nth(2)).toHaveAccessibleName("인용");
    await expect(roomNote(page, 9910).getByRole("button", { name: "리포스트" })).toHaveCount(0);
    await expect(roomNote(page, 9910).getByRole("button", { name: "공유" })).toHaveCount(0);

    const menu = await openQuoteMenu(page, 9910);
    await expect(menu.getByRole("menuitem")).toHaveText(["노트로 인용", "블로그 글로 인용"]);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
  });

  test("노트로 인용 posts into its room with no destination, visibility or draft to pick", async ({ page }) => {
    await openRoom(page);
    await (await openQuoteMenu(page, 9910)).getByRole("menuitem", { name: "노트로 인용" }).click();
    const dialog = page.getByRole("dialog", { name: "노트 인용" });
    await expect(dialog.locator('[data-quoted-note-id="9910"]')).toContainText("퇴근하다 한강 들름 바람 미쳤음");
    await dialog.getByRole("textbox").first().fill("한강 사진 좀 올려 줘");
    await expect(dialog.locator("[data-note-room-audience]")).toHaveText("동아리 사람들 멤버만 볼 수 있어요");
    await expect(dialog.locator("[data-note-destination]")).toHaveCount(0);
    await expect(dialog.getByLabel("공개 범위")).toHaveCount(0);
    await expect(dialog.getByTestId("note-drafts-button")).toHaveCount(0);

    await dialog.getByRole("button", { name: "동아리 사람들에 올리기" }).click();
    await expectOnTop(toastBy(page, "인용 노트를 올렸어요"));
    const first = page.locator("[data-room-item]").first();
    await expect(first).toContainText("한강 사진 좀 올려 줘");
    await expect(first.locator('[data-quoted-note-id="9910"]')).toContainText("퇴근하다 한강 들름 바람 미쳤음");
    await expect(first.locator("article.note-arrive")).toHaveCount(1);
  });

  test("a room quote left unsent is not kept as a draft and does not say it was", async ({ page }) => {
    await openRoom(page);
    await (await openQuoteMenu(page, 9909)).getByRole("menuitem", { name: "노트로 인용" }).click();
    const dialog = page.getByRole("dialog", { name: "노트 인용" });
    await dialog.getByRole("textbox").first().fill("쓰다 만 인용");
    await dialog.getByRole("button", { name: "취소" }).click();
    await expect(dialog).toHaveCount(0);
    expect(await page.getByTestId("toast").count()).toBe(0);
    expect(await page.evaluate(() => window.localStorage.getItem("kurl:note-drafts:1"))).toBeNull();
  });

  test("블로그 글로 인용 opens that room's post editor with the note drawn as a card", async ({ page }) => {
    await openRoom(page);
    await (await openQuoteMenu(page, 9908)).getByRole("menuitem", { name: "블로그 글로 인용" }).click();
    await expect(page).toHaveURL(/\/write\/new\?quote=.*notes%2F9908&room=1$/, { timeout: 30_000 });
    await expect(page.locator("[data-editor-room]")).toHaveText("동아리 사람들 멤버만 읽는 글", { timeout: 30_000 });
    const card = page.locator('[data-note-embed="9908"]');
    await expect(card).toContainText("엠티 사진 정리중인데 왜케 많냐", { timeout: 30_000 });
    await expect(card).toContainText("yuki_dev");
  });
});

test.describe("the editor's note card", () => {
  test("is a link card for a room note in a post of another room", async ({ page }) => {
    await page.goto(`/ko/blog/write/new?quote=${noteAt(9910)}&room=2`);
    await expect(page.locator("[data-editor-room]")).toHaveText("대학 동기 멤버만 읽는 글", { timeout: 30_000 });
    await expect(page.locator(`[data-link-card][data-url$="/notes/9910"]`)).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("[data-link-card] a")).toBeVisible();
    await expect(page.locator("[data-note-embed]")).toHaveCount(0);
  });

  test("is a link card for a room note in a post outside rooms", async ({ page }) => {
    await page.goto(`/ko/blog/write/new?quote=${noteAt(9910)}`);
    await expect(page.locator(`[data-link-card][data-url$="/notes/9910"]`)).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("[data-link-card] a")).toBeVisible();
    await expect(page.locator("[data-note-embed]")).toHaveCount(0);
  });
});

test.describe("a room post", () => {
  test("is the 404 page in the server's answer and to a signed-out reader", async ({ page }) => {
    const answer = await page.request.get(ROOM_POST);
    expect(answer.status()).toBe(404);
    const html = await answer.text();
    expect(html).not.toContain("비 오던 엠티의 밤");
    expect(html).not.toContain("펜션 지붕을 두드리던");

    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-signed-out", "1"));
    await page.goto(ROOM_POST);
    await expect(page.getByRole("heading", { name: "이 글을 찾을 수 없어요" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("member-post")).toHaveCount(0);
  });

  test("opens for a member, named as the room's, with nothing that carries it out", async ({ page }) => {
    await openMemberPost(page);
    await expect(page.getByRole("heading", { name: "이 글을 찾을 수 없어요" })).toHaveCount(0);
    await expect(page.locator("[data-post-condition]:visible")).toHaveText(["동아리 사람들 멤버만"]);
    await expect(page.locator(".prose-post")).toContainText("펜션 지붕을 두드리던 빗소리가 새벽까지 이어졌다.");
    await expect(page).toHaveTitle("비 오던 엠티의 밤");
    const actions = page.getByTestId("post-actions");
    await expect(actions.getByRole("button")).toHaveCount(3);
    await expect(actions.getByRole("button", { name: "공유" })).toHaveCount(0);
    await expect(actions.getByRole("button", { name: /엮기/ })).toHaveCount(0);
    const header = page.locator("[data-post-actions]");
    await header.getByRole("button", { name: "글 메뉴" }).click();
    await expect(header.getByRole("menuitem")).toHaveText(["노트로 인용", "차단", "신고"]);
    await expect(page.getByTestId("post-dock").getByRole("button", { name: /엮기/ })).toHaveCount(0);
  });

  test("a post that does not exist stays the 404 page for a signed-in reader", async ({ page }) => {
    await page.goto("/ko/p/hana/link-only-draft");
    await expect(page.getByRole("heading", { name: "이 글을 찾을 수 없어요" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("member-post")).toHaveCount(0);
  });

  test("draws a note of its own room as a card and another room's note as a link", async ({ page }) => {
    await openMemberPost(page);
    const card = page.locator('[data-note-embed="9908"]');
    await expect(card).toContainText("엠티 사진 정리중인데 왜케 많냐", { timeout: 30_000 });
    await expect(card.locator('a[data-quoted-note-id="9908"]')).toHaveAttribute("href", /\/notes\/9908$/);
    await expect(page.locator('.prose-post a[href$="/notes/9905"]')).toBeVisible();
    await expect(page.locator('[data-note-embed="9905"]')).toHaveCount(0);
    await expect(page.locator(".prose-post")).not.toContainText("졸업앨범 받음");
  });

  test("노트로 인용 posts into the post's room and joins its notes tab at once", async ({ page }) => {
    await openMemberPost(page);
    await expect(page.getByTestId("discussion-tab-notes")).toHaveCount(0);
    const actions = page.getByTestId("post-actions");
    await actions.getByRole("button", { name: "글 메뉴" }).click();
    await actions.getByRole("menuitem", { name: "노트로 인용" }).click();
    const dialog = page.getByRole("dialog", { name: "노트로 인용" });
    await expect(dialog.locator('[data-quoted-post-id="8801"]')).toContainText("비 오던 엠티의 밤");
    await dialog.getByRole("textbox").first().fill("이 글 덕분에 그날이 다시 생각났다");
    await expect(dialog.locator("[data-note-room-audience]")).toHaveText("동아리 사람들 멤버만 볼 수 있어요");
    await expect(dialog.locator("[data-note-destination]")).toHaveCount(0);
    await expect(dialog.getByTestId("note-drafts-button")).toHaveCount(0);
    await dialog.getByRole("button", { name: "동아리 사람들에 올리기" }).click();
    await expectOnTop(toastBy(page, "인용 노트를 올렸어요"));

    await page.getByTestId("discussion-tab-notes").click();
    await expect(page.getByTestId("discussion-tab-notes")).toHaveText("노트 1");
    const quoting = page.getByTestId("post-quote-notes").locator("article[data-note-id]").first();
    await expect(quoting).toContainText("이 글 덕분에 그날이 다시 생각났다");
    await expect(quoting.locator("[data-note-room]")).toHaveCount(0);
    const quoted = quoting.locator('[data-quoted-post-id="8801"]');
    await expect(quoted).toContainText("비 오던 엠티의 밤");
    await expect(quoted.locator("[data-audience-mark]")).toHaveCount(0);
  });
});

test("a post opened in the browser draws a room note as a link, even for a member of that room", async ({ page }) => {
  await page.goto("/ko/p/hana/locked-diary");
  const gate = page.getByTestId("post-gate");
  await gate.getByLabel("비밀번호", { exact: true }).fill("kurl-open", { timeout: 30_000 });
  await gate.getByRole("button", { name: "열기" }).click();
  await expect(page.locator(".prose-post")).toContainText("동아리 방에서 본 한마디를 옮겨 둔다.", { timeout: 30_000 });
  await expect(page.locator('.prose-post a[href$="/notes/9910"]')).toBeVisible();
  await expect(page.locator("[data-note-embed]")).toHaveCount(0);
  await expect(page.locator(".prose-post")).not.toContainText("퇴근하다 한강 들름");
});

test("the quote of a public note goes to one of my rooms through 올릴 곳", async ({ page }) => {
  await openHome(page);
  const walk = page.locator('article[data-note-id="5"]');
  await walk.getByRole("button", { name: "리포스트", exact: true }).click({ timeout: 30_000 });
  await walk.getByRole("menuitem", { name: "인용" }).click();
  const dialog = page.getByRole("dialog", { name: "노트 인용" });
  await dialog.getByRole("textbox").first().fill("동아리 산책 코스로 어때");
  const destination = dialog.locator("[data-note-destination]");
  await expect(destination.locator("option").first()).toHaveText("내 노트");
  await destination.selectOption({ label: "동아리 사람들" });
  await expect(dialog.locator("[data-note-room-audience]")).toHaveText("동아리 사람들 멤버만 볼 수 있어요");
  await expect(dialog.getByLabel("공개 범위")).toHaveCount(0);
  await dialog.getByRole("button", { name: "동아리 사람들에 올리기" }).click();
  await expectOnTop(toastBy(page, "인용 노트를 올렸어요"));

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator("nav.vt-bottom-nav").getByRole("link", { name: "방" }).click();
  const first = page.locator('[data-room-block="1"] [data-room-item]').first();
  await expect(first).toContainText("동아리 산책 코스로 어때", { timeout: 30_000 });
  await expect(first.locator('[data-quoted-note-id="5"]')).toContainText("산책하다 찍은 것들");
});

test.describe("quotes already in a room", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-room-quotes", "1"));
  });

  test("a room note shows the room note and the room post it quotes, the post as an open card", async ({ page }) => {
    await openRoom(page);
    const quotesNote = page.locator('[data-room-item="note-9912"]');
    await expect(quotesNote.locator('[data-quoted-note-id="9908"]')).toContainText("엠티 사진 정리중인데 왜케 많냐");
    const quotesPost = page.locator('[data-room-item="note-9911"]');
    const card = quotesPost.locator('[data-quoted-post-id="8801"]');
    await expect(card).toContainText("비 오던 엠티의 밤");
    await expect(card).toHaveAttribute("href", /rainy-mt-night$/);
    await expect(card.locator("[data-audience-mark]")).toHaveCount(0);
  });

  test("a room note's 인용 page lists the room post that carries it and the room notes that quote it", async ({ page }) => {
    await page.goto("/ko/p/yuki_dev/notes/9908");
    const quotes = page.getByRole("link", { name: /^인용 2/ });
    await expect(quotes).toBeVisible({ timeout: 30_000 });
    await quotes.click();
    await expect(page).toHaveURL(/\/notes\/9908\/quotes$/);
    const posts = page.getByTestId("quoting-posts");
    await expect(posts.getByRole("link", { name: /비 오던 엠티의 밤/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('article[data-note-id="9912"]')).toContainText("이 사진들 나도 받고 싶다");
  });
});

test.describe("at phone width", () => {
  test.use({ deviceScaleFactor: 2 });

  test("the room's quote menu and the room post stay inside the screen", async ({ page }) => {
    const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    await openRoom(page);
    const menu = await openQuoteMenu(page, 9910);
    const box = (await menu.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(await fits()).toBe(true);

    await openMemberPost(page);
    await expect(page.locator('[data-note-embed="9908"]')).toBeVisible({ timeout: 30_000 });
    expect(await fits()).toBe(true);
  });
});
