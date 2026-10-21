import { expect, test, type Page } from "@playwright/test";
import { expectOnTop, toastBy } from "./helpers/on-top";

// Mock-on lane: signed in as @dohyun. The rooms scene is iOS MockRooms: 동아리 사람들 (new 3), 대학 동기,
// 헥사고날 스터디, 우리 가족 (pinned), 제주 여행 2024 (quiet), an invitation to 주말 등산 모임 and a
// suggestion to start a room with 민지 and 준호.
test.use({ viewport: { width: 390, height: 844 } });

async function openRooms(page: Page) {
  await page.goto("/ko/blog/rooms");
  const screen = page.getByTestId("rooms-screen");
  await expect(screen.locator("[data-room-block]").first()).toBeVisible({ timeout: 30_000 });
  return screen;
}

const blockNames = (page: Page) => page.locator("[data-room-block] [data-room-name]");

test("the rooms tab reads 초대 → pinned → lively → quiet → suggestion, each block with its own two notes", async ({
  page,
}) => {
  const screen = await openRooms(page);
  await expect(screen.getByTestId("room-invitations")).toContainText("yuki_dev님이 주말 등산 모임에 초대했어요");
  await expect(blockNames(page)).toHaveText(["우리 가족", "동아리 사람들", "대학 동기", "헥사고날 스터디"]);
  await expect(screen.getByTestId("rooms-quiet").locator("[data-room-name]")).toHaveText([/^제주 여행 2024/]);
  await expect(screen.getByTestId("room-suggestion")).toContainText("민지, 준호님과 방 만들기");

  const club = page.locator('[data-room-block="1"]');
  await expect(club).toContainText("새 글 3");
  await expect(club.locator("article[data-note-id]")).toHaveCount(2);
  await expect(club.locator("article[data-note-id]").first()).toContainText("퇴근길에 한강 들렀다.");
  await expect(club.locator("[data-note-room]")).toHaveCount(0);
  await expect(page.locator('[data-room-block="5"] [data-room-pinned]')).toBeVisible();

  const order = await screen.evaluate((el) =>
    ["room-invitations", "rooms-quiet", "room-suggestion"].map((id) => {
      const node = el.querySelector(`[data-testid="${id}"]`)!;
      return node.getBoundingClientRect().top;
    }),
  );
  const firstBlock = await page.locator("[data-room-block]").first().boundingBox();
  expect(order[0]).toBeLessThan(firstBlock!.y);
  expect(order[1]).toBeGreaterThan(firstBlock!.y);
  expect(order[2]).toBeGreaterThan(order[1]);
});

test("더 보기 and a room's name open that room", async ({ page }) => {
  await openRooms(page);
  await page.locator('[data-room-more="1"]').click();
  await expect(page).toHaveURL(/\/rooms\/1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("동아리 사람들");

  await openRooms(page);
  await page.getByTestId("rooms-quiet").getByRole("link", { name: /제주 여행 2024/ }).click();
  await expect(page).toHaveURL(/\/rooms\/6$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("제주 여행 2024");
});

test("들어가기 on an invitation joins and opens that room", async ({ page }) => {
  await openRooms(page);
  await page.locator('[data-room-invitation="4"]').getByRole("button", { name: "들어가기" }).click();
  await expect(page).toHaveURL(/\/rooms\/4$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("주말 등산 모임");
});

test("pinning a room from its menu moves it to the top", async ({ page }) => {
  await openRooms(page);
  await page.getByRole("button", { name: "대학 동기 메뉴" }).click();
  await page.getByRole("menuitem", { name: "맨 위에 고정" }).click();
  await expect(blockNames(page).first()).toHaveText("대학 동기");
  await expect(page.locator('[data-room-block="2"] [data-room-pinned]')).toBeVisible();

  await page.locator('[data-room-block="2"] [data-room-name]').click({ button: "right" });
  await page.getByRole("menuitem", { name: "고정 풀기" }).click();
  await expect(blockNames(page)).toHaveText(["우리 가족", "동아리 사람들", "대학 동기", "헥사고날 스터디"]);
});

test("a quiet room comes up among the pinned blocks once pinned", async ({ page }) => {
  await openRooms(page);
  await page.getByRole("button", { name: "제주 여행 2024 메뉴" }).click();
  await page.getByRole("menuitem", { name: "맨 위에 고정" }).click();
  await expect(blockNames(page)).toHaveText(["우리 가족", "제주 여행 2024", "동아리 사람들", "대학 동기", "헥사고날 스터디"]);
  await expect(page.getByTestId("rooms-quiet")).toHaveCount(0);
});

test("a sixth pin is refused with the limit", async ({ page }) => {
  await openRooms(page);
  await page.getByRole("button", { name: "방 메뉴" }).click();
  await page.getByRole("menuitem", { name: "새 방 만들기" }).click();
  const dialog = page.getByRole("dialog", { name: "방 만들기" });
  await dialog.getByPlaceholder("방 이름").fill("새로 만든 방");
  await expect(dialog).toContainText("민지");
  await dialog.getByRole("button", { name: "만들기" }).click();
  await page.getByTestId("room-invite-sheet").getByRole("button", { name: "닫기" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("새로 만든 방");

  await page.locator("nav.vt-bottom-nav").getByRole("link", { name: "방" }).click();
  await expect(page.getByTestId("rooms-quiet")).toContainText("새로 만든 방");
  for (const name of ["동아리 사람들", "대학 동기", "헥사고날 스터디", "제주 여행 2024"]) {
    await page.getByRole("button", { name: `${name} 메뉴` }).click();
    await page.getByRole("menuitem", { name: "맨 위에 고정" }).click();
    await expect(page.locator("[data-room-block]").filter({ hasText: name }).locator("[data-room-pinned]")).toBeVisible();
  }
  await page.getByRole("button", { name: "새로 만든 방 메뉴" }).click();
  await page.getByRole("menuitem", { name: "맨 위에 고정" }).click();
  await expectOnTop(toastBy(page, "고정은 5개까지예요"));
  await expect(page.getByTestId("rooms-quiet")).toContainText("새로 만든 방");
});

test("a room note has like and reply but no repost, share or lock", async ({ page }) => {
  await page.goto("/ko/blog/rooms/1");
  const note = page.locator("article[data-note-id]").first();
  await expect(note).toContainText("퇴근길에 한강 들렀다.", { timeout: 30_000 });
  await expect(note.getByRole("button", { name: "좋아요", exact: true })).toBeVisible();
  await expect(note.locator("[data-note-reply]")).toBeVisible();
  await expect(note.getByRole("button", { name: /리포스트/ })).toHaveCount(0);
  await expect(note.getByRole("button", { name: "공유" })).toHaveCount(0);
  await expect(note.getByRole("img", { name: /멤버만/ })).toHaveCount(0);
  await note.getByRole("button", { name: "노트 메뉴" }).click();
  await expect(page.getByRole("menuitem", { name: "엮기" })).toHaveCount(0);
});

test("a room shows 오늘 and 어제 and keeps reading past the first page", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-room-long", "1"));
  await page.goto("/ko/blog/rooms/1");
  const days = page.locator("[data-room-day]");
  await expect(days.first()).toHaveText("오늘", { timeout: 30_000 });
  await expect(days.nth(1)).toHaveText("어제");
  await expect(page.locator("[data-room-item]")).toHaveCount(20);
  await page.locator("[data-room-more-notes]").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-room-item]")).toHaveCount(40);
});

test("a note written in a room goes to that room, said so on the button and below it", async ({ page }) => {
  await page.goto("/ko/blog/rooms/1");
  const box = page.getByRole("textbox", { name: "지금 뭐 하고 있어요?" });
  await box.fill("저도 7시 좋아요", { timeout: 30_000 });
  await expect(page.locator("[data-note-room-audience]")).toHaveText("동아리 사람들 멤버만 볼 수 있어요");
  await expect(page.getByRole("combobox", { name: "공개 범위" })).toHaveCount(0);
  await page.getByRole("button", { name: "동아리 사람들에 올리기" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("article[data-note-id]").first()).toContainText("저도 7시 좋아요");
  await page.locator("nav.vt-bottom-nav").getByRole("link", { name: "방" }).click();
  await expect(page.locator('[data-room-block="1"] article[data-note-id]').first()).toContainText("저도 7시 좋아요");
});

test("opening a room reads it, so 새 글 is gone on the way back", async ({ page }) => {
  await openRooms(page);
  await page.locator('[data-room-block="1"] [data-room-name]').click();
  await expect(page.getByTestId("room-timeline").locator("article[data-note-id]").first()).toBeVisible();
  await page.locator("nav.vt-bottom-nav").getByRole("link", { name: "방" }).click();
  await expect(page.locator('[data-room-block="1"]')).toBeVisible();
  await expect(page.locator('[data-room-block="1"]')).not.toContainText("새 글");
});

test("on 홈, a room note carries its room line, opens the room, and has no repost or share", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-home-rooms", "1"));
  await page.goto("/ko/blog?sort=following");
  const note = page.locator("article[data-note-id]", { hasText: "퇴근길에 한강 들렀다." });
  await expect(note.locator("[data-note-room]")).toHaveText("동아리 사람들 방에서", { timeout: 30_000 });
  await expect(note.getByRole("img", { name: "동아리 사람들 멤버만" })).toBeVisible();
  await expect(note.getByRole("button", { name: /리포스트/ })).toHaveCount(0);
  await expect(note.getByRole("button", { name: "공유" })).toHaveCount(0);
  await note.locator("[data-note-room]").click();
  await expect(page).toHaveURL(/\/rooms\/1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("동아리 사람들");
  await expect(page.locator("nav.vt-bottom-nav").getByRole("link", { name: "방" })).toHaveAttribute("aria-current", "page");
});

test("picking a room in 홈's composer posts there", async ({ page }) => {
  await page.goto("/ko/blog");
  await page.getByRole("textbox", { name: "노트 쓰기" }).fill("가족한테만 하는 말", { timeout: 30_000 });
  await page.getByRole("combobox", { name: "올릴 곳" }).selectOption({ label: "우리 가족" });
  await expect(page.locator("[data-note-room-audience]")).toHaveText("우리 가족 멤버만 볼 수 있어요");
  await page.getByRole("button", { name: "우리 가족에 올리기" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("nav.vt-bottom-nav").getByRole("link", { name: "방" }).click();
  await expect(page.locator('[data-room-block="5"]')).toContainText("가족한테만 하는 말");
});

test("with no rooms, one line and two ways in", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-empty", "rooms"));
  await page.goto("/ko/blog/rooms");
  const empty = page.getByTestId("blog-empty");
  await expect(empty).toContainText("친구들과 방을 만들면, 오늘 거기서 오간 말이 여기 먼저 보여요.", { timeout: 30_000 });
  await expect(empty.getByRole("button")).toHaveText(["방 만들기", "초대 링크로 들어가기"]);
});

test("방 sits after 홈 in the phone bar and marks itself current", async ({ page }) => {
  await openRooms(page);
  const bar = page.locator("nav.vt-bottom-nav");
  await expect(bar.locator(":scope > a, :scope > button")).toHaveText(["홈", "방", "둘러보기", "알림", "계정"]);
  await expect(bar.getByRole("link", { name: "방" })).toHaveAttribute("aria-current", "page");
});

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("the header reads 홈 · 방 · 둘러보기 and 방 opens the rooms tab", async ({ page }) => {
    await page.goto("/ko/blog");
    const sections = page.getByRole("banner").getByRole("navigation").first();
    await expect(sections.getByRole("link")).toHaveText(["홈", "방", "둘러보기"], { timeout: 30_000 });
    await sections.getByRole("link", { name: "방" }).click();
    await expect(page.getByTestId("rooms-screen").locator("[data-room-block]").first()).toBeVisible();
    await expect(sections.getByRole("link", { name: "방" })).toHaveAttribute("aria-current", "page");
  });
});

test.describe("전체", () => {
  test("strings every room's notes together, with the room line only where the room changes", async ({ page }) => {
    await openRooms(page);
    await page.getByRole("tab", { name: "전체" }).click();
    const all = page.getByTestId("rooms-all");
    const rows = all.locator("[data-rooms-all-item]");
    await expect(rows).toHaveCount(13);
    await expect(page.getByTestId("room-invitations")).toBeVisible();
    await expect(page.getByTestId("room-suggestion")).toHaveCount(0);
    await expect(page.locator("[data-room-block]")).toHaveCount(0);

    await expect(all.locator('article[data-note-id="9910"] [data-note-room]')).toHaveText("동아리 사람들 방에서");
    await expect(all.locator('article[data-note-id="9909"] [data-note-room]')).toHaveCount(0);
    await expect(all.locator('article[data-note-id="9908"] [data-note-room]')).toHaveCount(0);
    await expect(all.locator('article[data-note-id="9907"] [data-note-room]')).toHaveText("대학 동기 방에서");
    await expect(all.locator('article[data-note-id="9906"] [data-note-room]')).toHaveText("동아리 사람들 방에서");
    await expect(all.locator('[data-rooms-all-item="post-8802"] [data-note-room]')).toHaveCount(0);
    await expect(all.locator("[data-note-room]")).toHaveCount(9);
    await expect(all.getByRole("button", { name: /리포스트/ })).toHaveCount(0);
    await expect(all.getByRole("button", { name: "공유" })).toHaveCount(0);
    await expect(all.getByRole("img", { name: /멤버만/ })).toHaveCount(0);

    await all.locator('article[data-note-id="9907"] [data-note-room]').click();
    await expect(page).toHaveURL(/\/rooms\/2$/);
  });

  test("is remembered on the next visit", async ({ page }) => {
    await openRooms(page);
    await page.getByRole("tab", { name: "전체" }).click();
    await expect(page.getByTestId("rooms-all")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("tab", { name: "전체" })).toHaveAttribute("aria-selected", "true", { timeout: 30_000 });
    await expect(page.getByTestId("rooms-all")).toBeVisible();
    await page.getByRole("tab", { name: "방별" }).click();
    await page.reload();
    await expect(page.locator("[data-room-block]").first()).toBeVisible({ timeout: 30_000 });
  });

  test("reading there brings 새 글 down when going back to 방별", async ({ page }) => {
    await openRooms(page);
    await expect(page.locator('[data-room-block="1"]')).toContainText("새 글 3");
    await page.getByRole("tab", { name: "전체" }).click();
    await expect(page.getByTestId("rooms-all").locator("article[data-note-id]").first()).toBeVisible();
    await page.getByRole("tab", { name: "방별" }).click();
    await expect(page.locator('[data-room-block="1"]')).toBeVisible();
    await expect(page.locator('[data-room-block="1"]')).not.toContainText("새 글");
  });

  test("keeps reading past the first page", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-room-long", "1"));
    await openRooms(page);
    await page.getByRole("tab", { name: "전체" }).click();
    const rows = page.getByTestId("rooms-all").locator("[data-rooms-all-item]");
    await expect(rows).toHaveCount(20);
    await page.locator("[data-rooms-all-more]").scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(40);
  });
});
