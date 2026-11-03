import { expect, test, type Page } from "@playwright/test";
import { mockLinksResponse } from "../lib/api/_links-mocks";
import { mockBackend, signIn } from "./helpers/mock-backend";

const CODE = "e2eStat";
const demoStats = () => mockLinksResponse(`/api/v1/links/${CODE}/stats`, "GET") as Record<string, unknown>;

async function openWhere(page: Page, locale: string, regionClicks: unknown[]) {
  await signIn(page);
  await mockBackend(page, {
    [`GET /api/v1/links/${CODE}/stats`]: (route) => route.fulfill({ json: { ...demoStats(), regionClicks } }),
  });
  await page.goto(`/${locale}/stats/${CODE}#where`);
  await expect(page.locator("#stats-panel-where")).toBeVisible();
}

const regionNames = (page: Page, title: string) =>
  page
    .locator("section", { has: page.getByRole("heading", { name: title, exact: true }) })
    .getByTestId("breakdown-name");

test.describe("stats regions read in the viewer's own place names", () => {
  test("Japanese: coded regions show as 都道府県 and Korean provinces, other countries as sent", async ({ page }) => {
    await openWhere(page, "ja", [
      { region: "Tokyo", regionCode: "JP-13", count: 40 },
      { region: "Osaka", regionCode: "JP-27", count: 20 },
      { region: "Seoul", regionCode: "KR-11", count: 10 },
      { region: "California", regionCode: "US-CA", count: 5 },
    ]);
    await expect(regionNames(page, "都道府県・州")).toHaveText(["東京都", "大阪府", "ソウル特別市", "California"]);
  });

  test("Japanese: an older response without regionCode still reads 東京都", async ({ page }) => {
    await openWhere(page, "ja", [
      { region: "Tokyo", count: 40 },
      { region: "Gyeonggi-do", count: 8 },
      { region: "Berlin", count: 2 },
    ]);
    await expect(regionNames(page, "都道府県・州")).toHaveText(["東京都", "京畿道", "Berlin"]);
  });

  test("Korean: one place reported both ways is one row with the counts added", async ({ page }) => {
    await openWhere(page, "ko", [
      { region: "Tokyo", regionCode: "JP-13", count: 30 },
      { region: "Seoul", count: 12 },
      { region: "Tōkyō", count: 3 },
    ]);
    const rows = page
      .locator("section", { has: page.getByRole("heading", { name: "지역", exact: true }) })
      .getByTestId("breakdown-list")
      .locator("li");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("도쿄도");
    await expect(rows.nth(0)).toContainText("33");
    await expect(rows.nth(1)).toContainText("서울특별시");
  });
});
