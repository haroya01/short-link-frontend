import { expect, test, type Locator, type Page } from "@playwright/test";

// mock-on 레인: 목 세션은 @dohyun 이고 /p/dohyun 이 내 작가 페이지다. 프로필 목은 블로그 목의 dohyun
// (소개 "백엔드 개발자 · 사이드 프로젝트 중독", 사진 pravatar 12)과 목 세션의 표시 이름 "Dohyun Kim"에서 시작하고,
// 사진 올리기는 pravatar 32 를 돌려준다.

const ORIGINAL_BIO = "백엔드 개발자 · 사이드 프로젝트 중독";
const ORIGINAL_PHOTO = /img=12$/;
const UPLOADED_PHOTO = /img=32$/;

function authorHeader(page: Page) {
  return page.locator("header", { has: page.getByRole("heading", { level: 1 }) });
}

async function openEditor(page: Page) {
  await page.goto("/ko/p/dohyun");
  await page.getByRole("button", { name: "프로필 편집", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "프로필 편집" });
  await expect(dialog.getByLabel("소개")).toHaveValue(ORIGINAL_BIO);
  return dialog;
}

async function pickPhoto(page: Page, dialog: Locator) {
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#2f855a";
    ctx.fillRect(0, 0, 96, 96);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const chooser = page.waitForEvent("filechooser");
  await dialog.getByRole("button", { name: "사진 변경", exact: true }).click();
  await (await chooser).setFiles({ name: "me.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await page.getByRole("dialog", { name: "이미지 자르기" }).getByRole("button", { name: "적용", exact: true }).click();
  await expect(dialog.locator('img[src^="blob:"]')).toBeVisible();
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("프로필 편집 sits in the follow slot on my page only", async ({ page }) => {
    await page.goto("/ko/p/dohyun");
    await expect(authorHeader(page).getByRole("button", { name: "프로필 편집", exact: true })).toBeVisible();
    await expect(page.getByTestId("follow-button")).toHaveCount(0);

    await page.goto("/ko/p/minji");
    await expect(page.getByTestId("follow-button")).toBeVisible();
    await expect(page.getByRole("button", { name: "프로필 편집", exact: true })).toHaveCount(0);
  });

  test("a saved bio shows in the header right away", async ({ page }) => {
    const dialog = await openEditor(page);
    const save = dialog.getByRole("button", { name: "저장", exact: true });
    await expect(save).toBeDisabled();

    await dialog.getByLabel("소개").fill("주말마다 글 한 편");
    await expect(dialog.getByText("10 / 280")).toBeVisible();
    await save.click();

    await expect(page.getByRole("dialog", { name: "프로필 편집" })).toHaveCount(0);
    await expect(authorHeader(page).getByText("주말마다 글 한 편", { exact: true })).toBeVisible();
    await expect(authorHeader(page).getByText(ORIGINAL_BIO)).toHaveCount(0);
  });

  test("a saved display name leads the header and the account menu row", async ({ page }) => {
    const dialog = await openEditor(page);
    const name = dialog.getByLabel("표시 이름");
    await expect(name).toHaveValue("Dohyun Kim");
    await name.fill("김도현");
    await dialog.getByRole("button", { name: "저장", exact: true }).click();

    await expect(page.getByRole("dialog", { name: "프로필 편집" })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("김도현");
    await page.getByRole("button", { name: "계정", exact: true }).click();
    await expect(page.getByRole("menu").getByRole("menuitem").first()).toHaveAccessibleName(/김도현\s*@dohyun/);
  });

  test("deleting the photo puts the initial in the header and the nav avatar", async ({ page }) => {
    const dialog = await openEditor(page);
    await expect(authorHeader(page).getByRole("button", { name: "프로필 사진 크게 보기" }).locator("img")).toHaveAttribute(
      "src",
      ORIGINAL_PHOTO,
    );

    await dialog.getByRole("button", { name: "사진 삭제", exact: true }).click();
    await expect(dialog.locator("[data-avatar-tint]")).toHaveText("D");
    await expect(dialog.getByRole("button", { name: "사진 올리기", exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "저장", exact: true }).click();

    await expect(page.getByRole("dialog", { name: "프로필 편집" })).toHaveCount(0);
    await expect(authorHeader(page).getByRole("button", { name: "프로필 사진 크게 보기" })).toHaveCount(0);
    await expect(authorHeader(page).locator("[data-avatar-tint]")).toHaveText("D");
    const nav = page.getByRole("button", { name: "계정", exact: true });
    await expect(nav.locator("img")).toHaveCount(0);
    await expect(nav).toHaveText("D");
  });

  test("a picked photo waits for 저장, and 취소 leaves the old one", async ({ page }) => {
    let dialog = await openEditor(page);
    await pickPhoto(page, dialog);
    await dialog.getByRole("button", { name: "취소", exact: true }).click();
    await page.getByRole("dialog", { name: "바뀐 내용을 버릴까요?" }).getByRole("button", { name: "버리기" }).click();
    await expect(page.getByRole("dialog", { name: "프로필 편집" })).toHaveCount(0);
    const headerPhoto = authorHeader(page).getByRole("button", { name: "프로필 사진 크게 보기" }).locator("img");
    await expect(headerPhoto).toHaveAttribute("src", ORIGINAL_PHOTO);

    await page.getByRole("button", { name: "프로필 편집", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "프로필 편집" });
    await expect(dialog.locator("img")).toHaveAttribute("src", ORIGINAL_PHOTO);
    await pickPhoto(page, dialog);
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "프로필 편집" })).toHaveCount(0);
    await expect(headerPhoto).toHaveAttribute("src", UPLOADED_PHOTO);
    await expect(page.getByRole("button", { name: "계정", exact: true }).locator("img")).toHaveAttribute("src", UPLOADED_PHOTO);
  });

  test("closing with changes asks first: 계속 편집 keeps them, 버리기 drops them", async ({ page }) => {
    const dialog = await openEditor(page);
    const name = dialog.getByLabel("표시 이름");
    await name.fill("도현");
    await page.keyboard.press("Escape");

    const ask = page.getByRole("dialog", { name: "바뀐 내용을 버릴까요?" });
    await ask.getByRole("button", { name: "계속 편집" }).click();
    await expect(ask).toHaveCount(0);
    await expect(name).toHaveValue("도현");

    await dialog.getByRole("button", { name: "취소", exact: true }).click();
    await ask.getByRole("button", { name: "버리기" }).click();
    await expect(page.getByRole("dialog", { name: "프로필 편집" })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("dohyun");
  });

  test("blog settings opens the same editor, and 명함 편집 goes to the links card editor", async ({ page }) => {
    await page.goto("/ko/blog/settings");
    await page.getByRole("button", { name: "프로필 편집", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "프로필 편집" });
    await expect(dialog.getByLabel("표시 이름")).toBeVisible();
    await expect(dialog.getByLabel("소개")).toHaveValue(ORIGINAL_BIO);
    await dialog.getByRole("button", { name: "취소", exact: true }).click();
    await expect(dialog).toHaveCount(0);

    const card = page.getByRole("link", { name: "명함 편집" });
    await expect(card).toHaveAttribute("href", /\/ko\/settings\/profile$/);
    await expect(card.locator("svg.lucide-external-link")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "내 블로그 보기" }).locator("svg.lucide-external-link")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "표시 이름" })).toHaveCount(0);
  });
});

test("on a phone the editor is a bottom sheet with the same fields", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await openEditor(page);
  await expect(dialog.getByLabel("표시 이름")).toBeVisible();
  const save = dialog.getByRole("button", { name: "저장", exact: true });
  await expect(save).toBeInViewport({ ratio: 1 });
  await expect.poll(async () => {
    const box = await save.boundingBox();
    return box ? box.y + box.height : 0;
  }).toBeGreaterThan(844 - 120);
});
