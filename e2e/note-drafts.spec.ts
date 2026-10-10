import { expect, test, type Page } from "@playwright/test";

// mock-on 레인: 목 세션은 @dohyun(id 1)이다. 노트 초안은 이 기기의 localStorage 에 계정별로 남는다.
test.use({ viewport: { width: 1280, height: 900 } });

const header = (page: Page) => page.locator("header.vt-app-header");
const trigger = (page: Page) => header(page).locator('[data-compose-trigger="desktop"]');
const dialog = (page: Page) => page.getByRole("dialog", { name: "새 노트" });
const body = (page: Page) => dialog(page).getByRole("textbox", { name: "지금 떠오른 생각을 짧게 남겨 보세요" });

async function openNote(page: Page) {
  await trigger(page).click({ timeout: 30_000 });
  await page.getByRole("menuitem", { name: /^노트/ }).click();
  await expect(dialog(page)).toBeVisible();
}

const seed = (page: Page, key: string, drafts: object[]) =>
  page.addInitScript(([k, v]) => window.localStorage.setItem(k, v), [key, JSON.stringify(drafts)] as const);

const draft = (over: object = {}) => ({
  id: "seeded",
  updatedAt: Date.parse("2026-10-10T09:00:00Z"),
  body: "어제 쓰던 노트",
  parts: [],
  warning: null,
  visibility: "public",
  replyPolicy: "everyone",
  language: "ko",
  poll: null,
  scheduledAt: "",
  quote: null,
  imageCount: 0,
  ...over,
});

test("쓰다 닫으면 '초안에 남겼어요'가 뜨고, 이어 쓰기에서 글·열람 주의·스레드가 그대로 다시 열린다", async ({ page }) => {
  await page.goto("/ko/blog");
  await openNote(page);
  await body(page).fill("닫아도 남아야 하는 노트");
  await dialog(page).getByRole("button", { name: "열람 주의" }).click();
  await dialog(page).getByRole("textbox", { name: "열람 주의 문구" }).fill("결말 포함");
  await dialog(page).getByRole("button", { name: "스레드에 추가" }).click();
  await dialog(page).getByRole("textbox", { name: "이어서 써 보세요" }).fill("둘째 노트");
  await dialog(page).getByRole("button", { name: "취소" }).click();
  await expect(page.getByText("초안에 남겼어요")).toBeVisible();
  await expect(dialog(page)).toHaveCount(0);

  await trigger(page).click();
  const resume = page.getByRole("group", { name: "이어 쓰기" });
  const row = resume.getByRole("menuitem", { name: /닫아도 남아야 하는 노트/ });
  await expect(row).toContainText("2개");
  await row.click();
  await expect(body(page)).toHaveValue("닫아도 남아야 하는 노트");
  await expect(dialog(page).getByRole("textbox", { name: "열람 주의 문구" })).toHaveValue("결말 포함");
  await expect(dialog(page).getByRole("textbox", { name: "이어서 써 보세요" })).toHaveValue("둘째 노트");
});

test("빈 작성창을 닫으면 아무 알림도 없고 초안도 생기지 않는다", async ({ page }) => {
  await page.goto("/ko/blog");
  await openNote(page);
  await dialog(page).getByRole("button", { name: "취소" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByText("초안에 남겼어요")).toHaveCount(0);
  expect(await page.evaluate(() => window.localStorage.getItem("kurl:note-drafts:1"))).toBeNull();
});

test("올리면 그 초안이 이어 쓰기에서 사라진다", async ({ page }) => {
  await seed(page, "kurl:note-drafts:1", [draft()]);
  await page.goto("/ko/blog/notes");
  await trigger(page).click({ timeout: 30_000 });
  await page.getByRole("menuitem", { name: /어제 쓰던 노트/ }).click();
  await expect(body(page)).toHaveValue("어제 쓰던 노트");
  await dialog(page).getByRole("button", { name: "올리기" }).click();
  const notice = page.getByRole("dialog").filter({ hasText: "노트는 다른 서버에도 전해져요" });
  await notice.getByRole("button", { name: "알겠어요, 올릴게요" }).click();
  await expect(page.getByText("노트를 올렸어요")).toBeVisible();
  await trigger(page).click();
  await expect(page.getByRole("menuitem", { name: /어제 쓰던 노트/ })).toHaveCount(0);
});

test("다른 계정의 초안은 보이지 않는다", async ({ page }) => {
  await seed(page, "kurl:note-drafts:2", [draft({ body: "다른 계정의 노트" })]);
  await page.goto("/ko/blog");
  await trigger(page).click({ timeout: 30_000 });
  await expect(page.getByRole("menuitem", { name: /다른 계정의 노트/ })).toHaveCount(0);
});

test("머리의 '초안 N'에서 다른 초안으로 갈아타고, 지운 초안은 되돌릴 수 있다", async ({ page }) => {
  await seed(page, "kurl:note-drafts:1", [draft(), draft({ id: "second", body: "두 번째 초안", updatedAt: Date.parse("2026-10-09T09:00:00Z") })]);
  await page.goto("/ko/blog");
  await openNote(page);
  await dialog(page).getByRole("button", { name: "초안 2" }).click();
  const sheet = page.getByRole("dialog", { name: "초안" });
  await expect(sheet.getByRole("tab", { name: "노트" })).toHaveAttribute("aria-selected", "true");
  const rows = sheet.getByTestId("note-drafts").getByRole("listitem");
  await expect(rows).toHaveCount(2);

  await rows.filter({ hasText: "두 번째 초안" }).getByRole("button", { name: "초안 삭제" }).click();
  await expect(rows).toHaveCount(1);
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(rows).toHaveCount(2);

  await rows.filter({ hasText: "두 번째 초안" }).getByRole("button", { name: /두 번째 초안/ }).click();
  await expect(sheet).toHaveCount(0);
  await expect(body(page)).toHaveValue("두 번째 초안");
  await expect(dialog(page).getByRole("button", { name: "초안 1" })).toBeVisible();
});

test("사진이 있던 초안은 사진이 남지 않았다고 말한다", async ({ page }) => {
  await seed(page, "kurl:note-drafts:1", [draft({ imageCount: 2 })]);
  await page.goto("/ko/blog");
  await trigger(page).click({ timeout: 30_000 });
  await page.getByRole("menuitem", { name: /어제 쓰던 노트/ }).click();
  await expect(dialog(page).getByText("사진 2장은 초안에 남지 않았어요")).toBeVisible();
});

test("노트 피드의 작성창은 펼쳤을 때만 '초안 N'을 보여 주고, 고른 초안을 그 자리에서 잇는다", async ({ page }) => {
  await seed(page, "kurl:note-drafts:1", [draft()]);
  await page.goto("/ko/blog/notes");
  const composer = page.getByRole("textbox", { name: "지금 떠오른 생각을 짧게 남겨 보세요" });
  await expect(composer).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("note-drafts-button")).toHaveCount(0);
  await composer.click();
  await page.getByTestId("note-drafts-button").click();
  await page.getByRole("dialog", { name: "초안" }).getByRole("button", { name: /어제 쓰던 노트/ }).click();
  await expect(page.getByRole("textbox", { name: "지금 떠오른 생각을 짧게 남겨 보세요" })).toHaveValue("어제 쓰던 노트");
});
