import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

async function capture(page: Page, name: string) {
  const directory = process.env.KURL_UX_ARTIFACT_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${name}.png`), animations: "disabled" });
  await page.screenshot({ path: path.join(directory, `${name}-full.png`), fullPage: true, animations: "disabled" });
}

// Runs against NEXT_PUBLIC_USE_MOCKS=1; exercises real layout + client state with a complete 85-link library.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem("short-link:access-token", "mock-links-review");
    localStorage.setItem("kurl:cookie-consent:v1", "accepted");
  });
});

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`analysis tabs keep visitor details reachable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/ko/demo");
    const tabs = page.getByRole("tablist", { name: "통계 섹션" });
    await expect(tabs.getByRole("tab")).toHaveCount(4);
    await capture(page, `stats-${viewport.width}`);
    await tabs.getByRole("tab", { name: "방문 환경" }).click();
    await expect(page.getByRole("tabpanel")).toContainText("클릭 품질");
    await tabs.getByRole("tab", { name: "클릭 추이" }).click();
    await page.getByRole("button", { name: "7일", exact: true }).click();
    await expect(page.locator("#section-daily")).toContainText("최근 7일 사람 클릭");
    await expect(tabs.getByRole("tab", { name: "방문 환경" })).toBeVisible();
    await tabs.getByRole("tab", { name: "개요", exact: true }).click();
    const more = page.getByRole("button", { name: /변화 \d개 더 보기/ });
    await expect(more).toBeVisible();
    await more.click();
    await expect(page.getByRole("button", { name: "간단히 보기", exact: true })).toBeVisible();
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);
  });
}

test("favorites load beyond page one and keep account totals independent of list filters", async ({ page }) => {
  await page.goto("/ko/dashboard");
  await expect(page.getByText("링크 85개", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Launch brief/ })).toHaveCount(0);
  await capture(page, "dashboard-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileIdentity = page.locator("[data-vt-link-scope]:visible").first();
  await expect(mobileIdentity).toBeVisible();
  await expect(page.getByRole("button", { name: "복사", exact: true }).first()).toBeVisible();
  expect((await mobileIdentity.boundingBox())!.width).toBeGreaterThan(120);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await capture(page, "dashboard-mobile");
  await page.setViewportSize({ width: 1280, height: 800 });
  const scope = page.getByText("링크 85개", { exact: true });
  await expect(scope).toBeVisible();
  await page.getByRole("button", { name: "즐겨찾기", exact: true }).click();
  await expect(page.getByRole("link", { name: /Launch brief/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "더 불러오기", exact: true })).toHaveCount(0);
  const search = page.getByPlaceholder(/검색/);
  await search.fill("Launch brief");
  await expect(page.getByRole("link", { name: /Launch brief/ }).first()).toBeVisible();
  await expect(scope).toBeVisible();
  await search.fill("");
  await page.getByRole("button", { name: "즐겨찾기 순서", exact: true }).click();
  const order = page.getByRole("heading", { name: "즐겨찾기 순서", exact: true }).locator("..");
  await expect(order.locator("li").first()).toContainText("Launch brief");
  await order.getByRole("button", { name: "Launch brief 아래로 이동" }).click();
  await expect(order.locator("li").nth(1)).toContainText("Launch brief");
});
