import { expect, test, type Page, type Route } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

const ID = 12;
type Handler = (route: Route) => unknown;
const json = (body: unknown): Handler => (route) => route.fulfill({ json: body });
const fail: Handler = (route) => route.fulfill({ status: 500, json: { title: "boom" } });

const campaign = (over: Record<string, unknown> = {}) => ({
  id: ID, name: "신주쿠 봄 포스터", status: "ACTIVE", startsAt: "2026-10-20T00:00:00Z", endsAt: "2026-11-20T15:00:00Z", endedAt: null,
  defaultDestinationUrl: null, postEndAction: "KEEP", postEndDestinationUrl: null, postEndMessage: null, batchCount: 2,
  createdAt: "2026-10-18T03:00:00Z", updatedAt: "2026-10-18T03:00:00Z", ...over,
});

const batch = (id: number, name: string, distributorName: string, areaLabel: string, quantity: number, shortCode: string) => ({
  id, campaignId: ID, linkId: 9000 + id, shortCode, shortUrl: `https://kurl.me/${shortCode}`, destinationUrl: "https://shop.example.com",
  name, distributorName, areaLabel, quantity, memo: null, createdAt: "2026-10-18T03:10:00Z",
});

const BATCHES = [batch(1, "신주쿠역 동쪽", "A", "Shinjuku", 500, "q7Fk2"), batch(2, "오쿠보 상점가", "B", "Okubo", 300, "Lm9pX")];

const stats = {
  totalClicks: 173, testScans: 0, lastTestScanAt: null,
  byBatch: [
    { batchId: 1, batchName: "신주쿠역 동쪽", distributor: "A", area: "Shinjuku", quantity: 500, shortCode: "q7Fk2", clicks: 142 },
    { batchId: 2, batchName: "오쿠보 상점가", distributor: "B", area: "Okubo", quantity: 300, shortCode: "Lm9pX", clicks: 31 },
  ],
  byDistributor: [], byArea: [], byHour: [], byDay: [], heatmap: [],
};

const recommendation = {
  insufficient: false, insufficientReason: null, totalQuantity: 800, totalClicks: 173, avgRatePerHundred: 21.6,
  recommendations: [
    { batchId: 1, batchName: "신주쿠역 동쪽", distributor: "A", area: "Shinjuku", currentQuantity: 500, currentClicks: 142, currentRatePerHundred: 28.4, recommendedQuantity: 640, delta: 140, verdict: "BOOST" },
    { batchId: 2, batchName: "오쿠보 상점가", distributor: "B", area: "Okubo", currentQuantity: 300, currentClicks: 31, currentRatePerHundred: 10.3, recommendedQuantity: 160, delta: -140, verdict: "REDUCE" },
  ],
};

async function backend(page: Page, over: Record<string, Handler> = {}) {
  await signIn(page);
  await mockBackend(page, {
    "GET /api/v1/campaigns": json([campaign(), { ...campaign({ id: 13, name: "가을 전단" }) }]),
    [`GET /api/v1/campaigns/${ID}`]: json(campaign()),
    [`GET /api/v1/campaigns/${ID}/batches`]: json(BATCHES),
    [`GET /api/v1/campaigns/${ID}/stats`]: json(stats),
    [`GET /api/v1/campaigns/${ID}/recommendations`]: json(recommendation),
    ...over,
  });
}

test.describe("adding batches", () => {
  test("a fresh form shows no errors; a field shows its error once left, and submitting shows the rest and focuses the first", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await backend(page);
    await page.goto(`/ko/campaigns/${ID}/batches/new`);
    const name = page.getByPlaceholder("예: 신주쿠역 동쪽");
    await expect(name).toBeVisible();
    await expect(page.getByText("묶음 이름을 적어 주세요")).toHaveCount(0);
    await expect(page.getByText("수량을 적어 주세요")).toHaveCount(0);
    await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);

    await name.focus();
    await name.blur();
    await expect(page.getByText("묶음 이름을 적어 주세요")).toBeVisible();
    await expect(page.getByText("수량을 적어 주세요")).toHaveCount(0);

    await page.getByRole("button", { name: /묶음 만들기/ }).click();
    await expect(page.getByText("수량을 적어 주세요")).toBeVisible();
    await expect(page.getByText("목적지를 적어 주세요")).toBeVisible();
    await expect(name).toBeFocused();
  });
});

test.describe("campaign stats", () => {
  test("the compare list and recommendations fail in their own place, and the report stays", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    let recCalls = 0;
    await backend(page, {
      "GET /api/v1/campaigns": fail,
      [`GET /api/v1/campaigns/${ID}/recommendations`]: (route) => (++recCalls === 1 ? fail(route) : json(recommendation)(route)),
    });
    await page.goto(`/ko/campaigns/${ID}/stats`);
    await expect(page.locator("dl dd").first()).toHaveText("173");
    const retries = page.getByRole("button", { name: "다시 시도" });
    await expect(retries).toHaveCount(2);
    await retries.first().click();
    await expect(page.getByText("신주쿠역 동쪽").last()).toBeVisible();
    await expect(page.getByText("늘리기")).toBeVisible();
    await expect(retries).toHaveCount(1);
  });
});

test.describe("campaign list", () => {
  test("each campaign is a row with its human clicks and clicks per 100 sheets, and nothing appears only on hover", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await backend(page, {
      "GET /api/v1/campaigns": json([
        { ...campaign(), humanClicks: 173, totalQuantity: 800 },
        { ...campaign({ id: 13, name: "가을 전단", status: "ENDED" }), humanClicks: 0, totalQuantity: 0, endedAt: "2026-10-30T00:00:00Z" },
      ]),
    });
    await page.goto("/ko/campaigns");
    const rows = page.getByTestId("campaign-rows").locator("li");
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText("173");
    await expect(rows.first()).toContainText("100장당 21.6회");
    await expect(rows.nth(1)).toContainText("—");
    await expect(page.getByText("자세히", { exact: true })).toHaveCount(0);
    await rows.first().getByRole("link", { name: "신주쿠 봄 포스터" }).click();
    await expect(page).toHaveURL(/\/campaigns\/12$/);
  });

  test("before the API sends numbers, rows show the name and period without empty number slots", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await backend(page);
    await page.goto("/ko/campaigns");
    const rows = page.getByTestId("campaign-rows").locator("li");
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).not.toContainText("—");
  });
});

test.describe("campaign detail", () => {
  test("opens on the number line and one row per batch with its clicks per 100 sheets", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await backend(page);
    await page.goto(`/ko/campaigns/${ID}`);
    await expect(page.locator("dl dd").first()).toHaveText("173");
    const rows = page.getByTestId("campaign-rows").locator("li");
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText("100장당 28.4회");
    await expect(rows.first()).toContainText("A · Shinjuku · 500장 · /q7Fk2");
    await expect(page.locator("main .rounded-2xl")).toHaveCount(0);
    await rows.first().getByRole("button", { name: "신주쿠역 동쪽 메뉴" }).click();
    await expect(page.getByRole("menuitem", { name: "QR 내려받기" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "삭제" })).toBeVisible();
  });

  test("a campaign with no batches says so in one line with one action on the detail and stats pages", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await backend(page, {
      [`GET /api/v1/campaigns/${ID}`]: json(campaign({ batchCount: 0 })),
      [`GET /api/v1/campaigns/${ID}/batches`]: json([]),
      [`GET /api/v1/campaigns/${ID}/stats`]: json({ ...stats, totalClicks: 0, byBatch: [] }),
    });
    for (const path of [`/ko/campaigns/${ID}`, `/ko/campaigns/${ID}/stats`]) {
      await page.goto(path);
      await expect(page.getByText("아직 배포 묶음이 없어요", { exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "배포 묶음 추가" })).toHaveCount(1);
      await expect(page.getByText(/0\.0/)).toHaveCount(0);
    }
  });

  test("settings changes the name and clears the default URL, sending only what changed", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const bodies: unknown[] = [];
    let current = campaign({ defaultDestinationUrl: "https://shop.example.com/spring" });
    await backend(page, {
      [`GET /api/v1/campaigns/${ID}`]: (route) => route.fulfill({ json: current }),
      [`PATCH /api/v1/campaigns/${ID}`]: (route) => {
        const body = route.request().postDataJSON();
        bodies.push(body);
        current = { ...current, ...body, defaultDestinationUrl: body.defaultDestinationUrl || null };
        return route.fulfill({ json: current });
      },
    });
    await page.goto(`/ko/campaigns/${ID}`);
    await page.getByRole("button", { name: "설정", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("QR 캠페인 이름").fill("신주쿠 여름 포스터");
    await dialog.getByLabel("기본 목적지 URL").fill("");
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(bodies).toEqual([{ name: "신주쿠 여름 포스터", defaultDestinationUrl: "" }]);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("신주쿠 여름 포스터");
    await expect(page.getByText("https://shop.example.com/spring")).toHaveCount(0);
  });
});
