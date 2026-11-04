import { expect, test, type Page } from "@playwright/test";
import { mockLinksResponse } from "../lib/api/_links-mocks";
import { mockBackend, signIn } from "./helpers/mock-backend";

const CODE = "jrnlE2e";

const baseStats = () => ({ ...(mockLinksResponse(`/api/v1/links/${CODE}/stats`, "GET") as Record<string, unknown>), shortCode: CODE });

async function open(page: Page, stats: Record<string, unknown>) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  await mockBackend(page, {
    [`GET /api/v1/links/${CODE}/stats`]: (route) => route.fulfill({ json: stats }),
  });
  await page.goto(`/ko/stats/${CODE}`);
}

const sentences = (page: Page) => page.locator('button[aria-controls^="journal-evidence-"]');

test("the journal says what the server's facts say, in the server's order, with the country named", async ({ page }) => {
  await open(page, {
    ...baseStats(),
    insights: [
      { code: "topCountry", params: { country: "JP", percent: 40 }, evidence: "countries", ratio: 0.4, spark: null, type: "TOP_COUNTRY", message: "JP 40%" },
      { code: "peakHour", params: { hour: 21 }, evidence: "hourly", ratio: null, spark: null, type: "PEAK_HOUR", message: "21" },
    ],
  });
  await expect(sentences(page)).toHaveCount(2);
  await expect(sentences(page).first()).toContainText("일본에서 40%가 왔어요");
  await expect(sentences(page).nth(1)).toContainText("21");
  await sentences(page).first().click();
  await expect(page.locator("#journal-evidence-topCountry").getByTestId("breakdown-list")).toBeVisible();
});

test("without fact codes from the server, the journal keeps the web's own sentences", async ({ page }) => {
  await open(page, { ...baseStats(), insights: [{ type: "PEAK_HOUR", message: "old server sentence" }] });
  await expect(sentences(page).first()).toBeVisible();
  await expect(page.getByText("old server sentence")).toHaveCount(0);
  await expect(page.getByText("일본에서 40%가 왔어요")).toHaveCount(0);
});
