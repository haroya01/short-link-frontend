import { expect, test } from "@playwright/test";

const CODE = "spr1ng";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:cookie-consent:v1", "accepted"));
});

test("the log tab opens straight into the click rows and pages by cursor", async ({ page }) => {
  await page.goto(`/ko/stats/${CODE}`);
  await page.getByRole("tab", { name: "기록", exact: true }).click();
  await expect(page).toHaveURL(/#log$/);

  const panel = page.locator("#stats-panel-log");
  const rows = panel.locator("tbody tr");
  await expect(rows).toHaveCount(50);
  await expect(rows.first()).toContainText("Seoul, KR");
  await expect(panel.getByRole("button", { name: "클릭 이벤트 CSV" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "일별 통계 CSV" })).toBeVisible();

  await panel.getByRole("button", { name: "더 보기" }).click();
  await expect(rows).toHaveCount(62);
  await expect(panel.getByRole("button", { name: "더 보기" })).toHaveCount(0);
  await expect(panel.getByText("90일보다 오래된 개별 클릭은 보관하지 않아요", { exact: true })).toBeVisible();
});

test("returning ratio and channel depth name the raw window they are counted over", async ({ page }) => {
  await page.goto(`/ko/stats/${CODE}#who`);
  const returning = page.locator("#stats-panel-who .rounded-2xl", { hasText: "재방문 비율" });
  await expect(returning).toContainText("최근 90일");

  await page.getByRole("tab", { name: "유입 경로", exact: true }).click();
  await expect(page.locator("#section-channel-depth header")).toContainText("최근 90일");
});

test("the header export is named for the summary it holds, apart from the log tab's two", async ({ page }) => {
  await page.goto(`/ko/stats/${CODE}#log`);
  await expect(page.getByRole("button", { name: "요약 CSV", exact: true })).toHaveText("요약 CSV");
  await expect(page.locator("button", { hasText: /^CSV$/ })).toHaveCount(0);
});

test("the privacy policy says raw clicks go after 90 days and request logs after about 30", async ({ page }) => {
  await page.goto("/ko/privacy");
  await expect(page.getByText(/단축 링크 클릭의 원본 기록\(IP·브라우저 정보 포함\)은 90일 뒤 삭제되고, 그 뒤에는 날짜별 집계만 남습니다/)).toBeVisible();
  await expect(page.getByText(/운영 요청 로그는 약 30일/)).toBeVisible();
});

test("link settings no longer carry the click log or its exports", async ({ page }) => {
  await page.goto(`/ko/stats/${CODE}#settings`);
  await expect(page.getByRole("heading", { name: "보호" })).toBeVisible();
  await expect(page.getByRole("button", { name: "클릭 이벤트 CSV" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "원본 클릭 로그" })).toHaveCount(0);
});

test("a shared #log link on a phone shows the selected tab and two-line rows", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(`/ko/stats/${CODE}#log`);
  const tab = page.getByRole("tab", { name: "기록", exact: true });
  await expect(tab).toHaveAttribute("aria-selected", "true");
  const list = await page.getByRole("tablist").boundingBox();
  const box = await tab.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(list!.x);
  expect(box!.x + box!.width).toBeLessThanOrEqual(list!.x + list!.width);

  const panel = page.locator("#stats-panel-log");
  await expect(panel.locator("li").first()).toBeVisible();
  await expect(panel.locator("table")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
