import { expect, test, type Page } from "@playwright/test";
import { expectOnTop, toastBy } from "./helpers/on-top";

// Mock-on lane: signed in as @dohyun, owner of 동아리 사람들 (room 1) where 은성 asked to join and
// 김독자 already has an invitation. Invite codes: hike (주말 등산 모임), study (approval), old (expired),
// off (disabled), spent (used up), packed (full).
test.use({ viewport: { width: 390, height: 844 } });

async function openInvite(page: Page) {
  await page.goto("/ko/blog/rooms/1");
  await page.locator("[data-room-invite]").click({ timeout: 30_000 });
  const sheet = page.getByTestId("room-invite-sheet");
  await expect(sheet.locator("[data-room-candidates]")).toBeVisible();
  return sheet;
}

test("the invite sheet marks members and pending invites, gathers picks above and invites them", async ({ page }) => {
  const sheet = await openInvite(page);
  await expect(sheet.locator('[data-room-candidate="minji"]')).toContainText("멤버");
  await expect(sheet.locator('[data-room-candidate="minji"]')).toBeDisabled();
  await expect(sheet.locator('[data-room-candidate="reader_kim"]')).toContainText("초대함");

  await sheet.locator('[data-room-candidate="haneul"]').click();
  await sheet.locator('[data-room-candidate="sora"]').click();
  await sheet.getByRole("tab", { name: "팔로워" }).click();
  await sheet.locator('[data-room-candidate="eunseong"]').click();
  await expect(sheet.getByRole("list", { name: "고른 사람" }).getByRole("button")).toHaveText([/하늘$/, /소라$/, /은성$/]);
  await sheet.getByRole("button", { name: "소라 빼기" }).click();
  await expect(sheet.getByRole("list", { name: "고른 사람" }).getByRole("button")).toHaveText([/하늘$/, /은성$/]);

  await sheet.getByRole("button", { name: "2명 초대" }).click();
  await expectOnTop(toastBy(page, "2명에게 초대를 보냈어요"));
  await expect(sheet).toHaveCount(0);

  await page.locator("[data-room-settings]").click();
  await expect(page.getByTestId("room-invitees").locator("[data-room-person]")).toHaveText([/하늘/, /은성/, /김독자/]);
});

test("search finds people outside the two lists", async ({ page }) => {
  const sheet = await openInvite(page);
  await sheet.getByRole("searchbox", { name: "이름이나 아이디로 찾기" }).fill("나래");
  await expect(sheet.getByRole("tab")).toHaveCount(0);
  await sheet.locator('[data-room-candidate="narae"]').click();
  await expect(sheet.getByRole("button", { name: "1명 초대" })).toBeEnabled();
});

test("QR opens the link and its settings on their own, and a new link takes the chosen limit", async ({ page }) => {
  const sheet = await openInvite(page);
  await sheet.getByRole("button", { name: "QR" }).click();
  const dialog = page.getByTestId("room-link-dialog");
  await expect(dialog.getByRole("img", { name: "초대 QR 코드" })).toBeVisible();
  await expect(dialog.locator("[data-room-link-url]")).toHaveText("https://kurl.me/R100k");
  await dialog.getByLabel("사용 횟수").selectOption({ label: "5번" });
  await dialog.getByRole("switch", { name: "들어오기 전에 승인" }).click();
  await dialog.locator("[data-room-make-link]").click();
  await expect(dialog.locator("[data-room-link-url]")).toHaveText("https://kurl.me/R101k");
  await expect(dialog).toContainText("코드 r101x · 0/5번 사용");
  await dialog.getByRole("button", { name: "완료" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(sheet).toBeVisible();
});

test("settings: the owner approves a request, removes a member and renames the room", async ({ page }) => {
  await page.goto("/ko/blog/rooms/1/settings");
  const members = page.getByTestId("room-members");
  await expect(members.locator("[data-room-person]")).toHaveCount(4, { timeout: 30_000 });

  await page.getByTestId("room-requests").getByRole("button", { name: "승인" }).click();
  await expect(page.getByTestId("room-requests")).toHaveCount(0);
  await expect(members.locator('[data-room-person="eunseong"]')).toBeVisible();

  await members.locator('[data-room-person="junho"]').getByRole("button", { name: "내보내기" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "내보내기" }).click();
  await expect(members.locator('[data-room-person="junho"]')).toHaveCount(0);

  const name = page.getByLabel("이름", { exact: true });
  await name.fill("동아리 2기");
  await page.getByRole("button", { name: "저장" }).click();
  await expectOnTop(toastBy(page, "이름을 바꿨어요"));
  await expect(page.getByRole("link", { name: "동아리 2기" })).toBeVisible();
});

test("settings: leaving the room takes it off the rooms tab", async ({ page }) => {
  await page.goto("/ko/blog/rooms/2/settings");
  await expect(page.getByTestId("room-members")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("이름", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "방 나가기" }).click();
  const dialog = page.getByRole("dialog", { name: "방에서 나갈까요?" });
  await dialog.getByLabel("내 글 삭제하고 나가기").check();
  await dialog.getByRole("button", { name: "방 나가기" }).click();
  await expect(page).toHaveURL(/\/rooms$/);
  await expect(page.locator("[data-room-block]").first()).toBeVisible();
  await expect(page.locator('[data-room-block="2"]')).toHaveCount(0);
});

test("a new room opens the invite sheet with the suggested friends already picked", async ({ page }) => {
  await page.goto("/ko/blog/rooms");
  await page.getByTestId("room-suggestion").getByRole("button", { name: /방 만들기/ }).click({ timeout: 30_000 });
  const dialog = page.getByRole("dialog", { name: "방 만들기" });
  await dialog.getByPlaceholder("방 이름").fill("셋이서");
  await dialog.getByRole("button", { name: "만들기" }).click();
  const sheet = page.getByTestId("room-invite-sheet");
  await expect(sheet.getByRole("list", { name: "고른 사람" }).getByRole("button")).toHaveText([/민지$/, /준호$/]);
  await sheet.getByRole("button", { name: "2명 초대" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("셋이서");
});

test("the apex invite address lands on the invite page, and 들어가기 opens that room", async ({ page }) => {
  await page.context().addCookies([{ name: "NEXT_LOCALE", value: "ko", url: test.info().project.use.baseURL ?? "http://localhost:3001" }]);
  await page.goto("/rooms/join/hike");
  await expect(page).toHaveURL(/\/ko\/rooms\/join\/hike$/);
  const join = page.getByTestId("room-join");
  await expect(join.getByRole("heading", { level: 1 })).toHaveText("주말 등산 모임", { timeout: 30_000 });
  await expect(join).toContainText("yuki_dev님이 초대했어요 · 멤버 3명");
  await expect(join.locator("[data-room-faces] > span")).toHaveCount(3);
  await join.getByRole("button", { name: "들어가기" }).click();
  await expect(page).toHaveURL(/\/rooms\/4$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("주말 등산 모임");
});

test("an approval room asks instead of joining", async ({ page }) => {
  await page.goto("/ko/rooms/join/study");
  const join = page.getByTestId("room-join");
  await expect(join).toContainText("방장이 받아 줘야 들어갈 수 있어요.", { timeout: 30_000 });
  await join.getByRole("button", { name: "들어가기 요청" }).click();
  await expect(join.getByRole("status")).toHaveText("요청을 보냈어요. 방장이 받아 주면 들어가요.");
});

test("the invite page says why a link lets no one in", async ({ page }) => {
  for (const [code, reason] of [
    ["old", "초대 링크가 만료됐어요"],
    ["off", "초대 링크가 꺼져 있어요"],
    ["spent", "초대 링크를 쓸 수 있는 횟수가 다 찼어요"],
    ["packed", "방이 가득 찼어요"],
    ["nothing", "없는 초대 링크예요"],
  ] as const) {
    await page.goto(`/ko/rooms/join/${code}`);
    const join = page.getByTestId("room-join");
    await expect(join, code).toContainText(reason, { timeout: 30_000 });
    await expect(join.getByRole("button", { name: "들어가기" }), code).toHaveCount(0);
  }
});

test("signed out, the invite page asks to sign in, and coming back signed in goes straight to the room", async ({
  page,
  browser,
}) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-signed-out", "1"));
  await page.goto("/ko/rooms/join/hike");
  await page.getByTestId("room-join").getByRole("button", { name: "로그인하고 들어가기" }).click({ timeout: 30_000 });
  await expect(page.getByRole("dialog")).toContainText("방에 들어가려면 로그인하세요");

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const signedIn = await context.newPage();
  await signedIn.goto("/ko/rooms/join/hike?join=1");
  await expect(signedIn).toHaveURL(/\/rooms\/4$/, { timeout: 30_000 });
  await expect(signedIn.getByRole("heading", { level: 1 })).toHaveText("주말 등산 모임");
  await context.close();
});
