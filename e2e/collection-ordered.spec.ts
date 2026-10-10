import { expect, test } from "@playwright/test";

// mock-on 레인: '길'은 '컬렉션'에 합쳐졌고 순서는 컬렉션의 속성(ordered)이다.
// 글 3(haruka/hexagonal-too-much)은 결정을 남기는 법(순서대로, 4편 중 2번째) · 프로덕트 노트(순서 없음) ·
// 느린 사고(ordered 없이 kind 만 오는 이전 서버 모양, 소속 정보 없음)에 담겨 있다. 목 세션은 @dohyun 이고
// 프로덕트 노트(id 2)의 주인이다.
test.use({ viewport: { width: 1280, height: 900 } });

const POST = "/ko/p/haruka/hexagonal-too-much";

test("글 끝은 '이 글이 담긴 컬렉션' 하나로 묶고, 순서 있는 컬렉션만 번호와 'N편 중 M번째'를 단다", async ({ page }) => {
  await page.goto(POST);
  const section = page.locator("section").filter({ has: page.getByText("이 글이 담긴 컬렉션", { exact: true }) });
  await expect(section).toBeVisible({ timeout: 30_000 });

  const ordered = section.getByRole("link", { name: /결정을 남기는 법/ });
  await expect(ordered).toContainText("@jiwon");
  await expect(ordered).toContainText("4편 중 2번째");
  await expect(ordered.locator("[data-step-badge]")).toHaveText("2");

  const plain = section.getByRole("link", { name: /프로덕트 노트/ });
  await expect(plain).toContainText("8개");
  await expect(plain).not.toContainText("번째");
  await expect(plain.locator("[data-step-badge]")).toHaveCount(0);

  const legacy = section.getByRole("link", { name: /느린 사고/ });
  await expect(legacy).toContainText("5개");
  await expect(legacy.locator("[data-step-badge]")).toHaveCount(0);

  await expect(page.locator("body")).not.toContainText("길에 엮");
  await expect(page.locator("body")).not.toContainText("놓인 길");
});

test("엮기 시트엔 '새 길'이 없고, 새 컬렉션을 '순서대로 읽기'로 만들 수 있다", async ({ page }) => {
  await page.goto(POST);
  await page.locator("article header").getByRole("button", { name: /컬렉션에 엮기$/ }).click({ timeout: 30_000 });
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("button", { name: "새 컬렉션 만들기" })).toBeVisible();
  await expect(sheet.getByText("새 길")).toHaveCount(0);

  await sheet.getByRole("button", { name: "새 컬렉션 만들기" }).click();
  await sheet.getByRole("textbox", { name: "이름" }).fill("천천히 읽을 것");
  const order = sheet.getByRole("switch", { name: "순서대로 읽기" });
  await expect(order).toHaveAttribute("aria-checked", "false");
  await order.click();
  await expect(order).toHaveAttribute("aria-checked", "true");
  await sheet.getByRole("button", { name: "만들기", exact: true }).click();

  const created = sheet.getByRole("checkbox", { name: /천천히 읽을 것/ });
  await expect(created).toHaveAttribute("aria-checked", "true");
  await expect(created).toContainText("순서대로 읽기");
});

test("주인은 컬렉션 설정에서 '순서대로 읽기'를 켜고, 켜면 번호 매긴 길잡이로 읽힌다", async ({ page }) => {
  await page.goto("/ko/blog/collections/2");
  await expect(page.getByRole("heading", { level: 1, name: "프로덕트 노트" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("header").getByText("순서대로 읽기")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "순서 편집" })).toHaveCount(0);

  await page.getByRole("button", { name: "편집" }).click();
  const order = page.getByRole("switch", { name: "순서대로 읽기" });
  await expect(order).toHaveAttribute("aria-checked", "false");
  await order.click();
  await page.getByRole("button", { name: "저장" }).click();

  await expect(page.locator("header").getByText("순서대로 읽기")).toBeVisible();
  await expect(page.getByRole("button", { name: "순서 편집" })).toBeVisible();
});
