import { expect, test, type Page, type Request } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

const stats = (clicks: number) => ({
  totalClicks: clicks,
  testScans: 0,
  lastTestScanAt: null,
  byBatch: [{ batchId: 1, batchName: "역 앞", distributor: null, area: "강남", quantity: 100, shortCode: "abc123", clicks }],
  byDistributor: [],
  byArea: [{ key: "강남", clicks, totalQuantity: 100, clickRatePerHundred: clicks }],
  byHour: [],
  byDay: [],
  heatmap: [],
});

const summary = (id: number, name: string) => ({
  id, name, status: "ACTIVE", startsAt: "2026-10-01T00:00:00Z", endsAt: "2026-12-01T00:00:00Z", batchCount: 1,
});

async function campaignBackend(page: Page, compare: (request: Request, call: number) => { status: number; json: unknown }) {
  const calls: Request[] = [];
  await signIn(page);
  await mockBackend(page, {
    "GET /api/v1/campaigns/1": (route) =>
      route.fulfill({
        json: {
          ...summary(1, "가을 전단"), endedAt: null, defaultDestinationUrl: null, postEndAction: "KEEP",
          postEndDestinationUrl: null, postEndMessage: null, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z",
        },
      }),
    "GET /api/v1/campaigns/1/stats": (route) => route.fulfill({ json: stats(12) }),
    "GET /api/v1/campaigns/1/recommendations": (route) =>
      route.fulfill({
        json: { insufficient: true, insufficientReason: "아직 데이터가 적어요", totalQuantity: 0, totalClicks: 0, avgRatePerHundred: 0, recommendations: [] },
      }),
    "GET /api/v1/campaigns": (route) => route.fulfill({ json: [summary(1, "가을 전단"), summary(2, "봄 전단")] }),
    "POST /api/v1/campaigns/stats/compare": (route) => {
      calls.push(route.request());
      return route.fulfill(compare(route.request(), calls.length));
    },
  });
  return calls;
}

const asBackend = (request: Request) =>
  request.headers()["content-type"]?.startsWith("application/json")
    ? {
        status: 200,
        json: {
          campaigns: [
            { campaignId: 1, name: "가을 전단", stats: stats(12) },
            { campaignId: 2, name: "봄 전단", stats: stats(30) },
          ],
        },
      }
    : { status: 415, json: { status: 415, title: "Unsupported Media Type" } };

const compareSection = (page: Page) => page.locator("section").filter({ hasText: "다른 캠페인과 비교" });

test.describe("campaign compare", () => {
  test("picking a campaign sends the ids as JSON and shows both side by side", async ({ page }) => {
    const calls = await campaignBackend(page, asBackend);
    await page.goto("/ko/campaigns/1/stats");

    await compareSection(page).getByRole("combobox").selectOption({ label: "봄 전단" });

    await expect.poll(() => calls.length).toBe(1);
    expect(calls[0].headers()["content-type"]).toMatch(/^application\/json/);
    expect(calls[0].postDataJSON()).toEqual({ campaignIds: [1, 2] });
    await expect(compareSection(page).locator("p", { hasText: "봄 전단" })).toBeVisible();
    await expect(compareSection(page).getByText("30", { exact: true })).toBeVisible();
  });

  test("a failed compare shows the error with a retry instead of the pick hint", async ({ page }) => {
    const calls = await campaignBackend(page, (request, call) =>
      call === 1 ? { status: 500, json: { status: 500, title: "Server Error" } } : asBackend(request),
    );
    await page.goto("/ko/campaigns/1/stats");

    await compareSection(page).getByRole("combobox").selectOption({ label: "봄 전단" });

    const failed = compareSection(page).getByTestId("error-state");
    await expect(failed).toBeVisible();
    await expect(failed).toContainText("불러오지 못했어요");
    await expect(compareSection(page).getByText("비교할 캠페인을 골라 주세요", { exact: false })).toHaveCount(0);

    await failed.getByRole("button", { name: "다시 시도" }).click();
    await expect.poll(() => calls.length).toBe(2);
    await expect(failed).toHaveCount(0);
    await expect(compareSection(page).locator("p", { hasText: "봄 전단" })).toBeVisible();
  });
});
