import { expect, test, type Page } from "@playwright/test";
import { MY_PROFILE, mockBackend, signIn } from "./helpers/mock-backend";

const LINKS = [
  { shortCode: "spr1ng", originalUrl: "https://blog.example.com/summer" },
  { shortCode: "f4ll", originalUrl: "https://blog.example.com/autumn" },
];

function linkEntry(id: number, shortCode: string, originalUrl: string) {
  return {
    kind: "LINK", id, shortCode, shortUrl: `https://kurl.me/${shortCode}`, originalUrl,
    ogTitle: null, ogImage: null, highlighted: false, content: null,
  };
}

async function editor(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await mockBackend(page, {
    "GET /api/v1/links/me": (route) =>
      route.fulfill({
        json: {
          items: LINKS.map((l) => ({
            ...l, shortUrl: `https://kurl.me/${l.shortCode}`, createdAt: "2026-09-01T00:00:00Z", expiresAt: null,
            clickCount: 0, tags: [], clicksLast7d: [0, 0, 0, 0, 0, 0, 0],
          })),
          hasMore: false,
          nextCursor: null,
        },
      }),
    "GET /api/v1/public/profiles/e2euser": (route) =>
      route.fulfill({
        json: {
          ...MY_PROFILE,
          entries: [
            linkEntry(1, "spr1ng", LINKS[0].originalUrl),
            { kind: "TEXT", id: 7, shortCode: null, ogTitle: null, ogImage: null, highlighted: false, content: "가을에 쓴 글" },
            linkEntry(2, "f4ll", LINKS[1].originalUrl),
          ],
          publishedPostCount: 0,
        },
      }),
    "GET /api/v1/users/me/profile/stats/summary": (route) =>
      route.fulfill({ json: { today: 3, week: 12, month: 40, allTime: 90 } }),
  });
  await page.goto("/ko/settings/profile");
  await expect(page.locator("li[draggable]").getByText("가을에 쓴 글")).toBeVisible();
}

const rows = (page: Page) => page.locator("li[draggable]");

test("a phone row carries the move arrows and one more-actions menu, nothing else to press", async ({ page }) => {
  await editor(page);
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByRole("button", { name: "작업 더 보기" })).toHaveCount(3);
  await expect(page.getByRole("button", { name: "위로 옮기기" })).toHaveCount(3);
  for (const name of ["빼기", "삭제", "수정", "대표로 올리기"]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  }

  await rows(page).nth(0).getByRole("button", { name: "작업 더 보기" }).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitemcheckbox", { name: "대표로 올리기" })).toHaveAttribute("aria-checked", "false");
  await expect(menu.getByRole("menuitem")).toHaveText(["프로필에서 빼기"]);
  await page.keyboard.press("Escape");

  await rows(page).nth(1).getByRole("button", { name: "작업 더 보기" }).click();
  await expect(page.getByRole("menu").getByRole("menuitem")).toHaveText(["수정", "삭제"]);
});

test("a text block is a row like the others, not a section head that folds what follows", async ({ page }) => {
  await editor(page);
  await expect(page.getByRole("button", { name: /섹션/ })).toHaveCount(0);
  await expect(rows(page).nth(1)).not.toContainText("1개");
  const before = (await rows(page).nth(0).boundingBox())!;
  const after = (await rows(page).nth(2).boundingBox())!;
  expect(after.x).toBe(before.x);
  expect(after.width).toBe(before.width);
});

test("the phone preview opens from the page head into a sheet with one title and no phone frame", async ({ page }) => {
  await editor(page);
  const trigger = page.getByRole("button", { name: "미리보기", exact: true });
  await expect(trigger).toHaveCSS("position", "static");
  await trigger.click();
  const sheet = page.getByRole("dialog", { name: "미리보기" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("미리보기", { exact: true })).toHaveCount(1);
  await expect(sheet.locator(".device")).toHaveCount(0);
  await expect(sheet).toContainText("가을에 쓴 글");
});

test("the visit summary names its window as the last 24 hours", async ({ page }) => {
  await editor(page);
  await expect(page.getByText("24시간", { exact: true })).toBeVisible();
  await expect(page.getByText("오늘", { exact: true })).toHaveCount(0);
});
