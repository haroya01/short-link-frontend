import { expect, test, type Page } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";
import { mockLinksResponse } from "../lib/api/_links-mocks";

const sse = (name: string, data: unknown) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
const click = (shortCode: string, over: Record<string, unknown> = {}) =>
  sse("click", { shortCode, occurredAt: new Date().toISOString(), countryCode: "KR", deviceClass: "iOS", channel: "instagram", bot: false, ...over });

async function liveDashboard(page: Page) {
  const queue: string[] = [];
  await signIn(page);
  await mockBackend(page, {
    "GET /api/v1/links/me/overview": (route) =>
      route.fulfill({
        json: { ...(mockLinksResponse("/api/v1/links/me/overview", "GET") as object), clicksToday: 412, updatedAt: new Date().toISOString() },
      }),
  });
  await page.route("**/api/v1/users/me/clicks/stream?**", (route) =>
    route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream" },
      body: sse("ready", { ok: true }) + queue.splice(0).join(""),
    }),
  );
  return queue;
}

async function enterFromMore(page: Page) {
  await page.goto("/ko/more");
  await expect(page.getByRole("heading", { level: 1, name: "더보기" })).toBeVisible();
}

const linksTab = (page: Page) => page.locator("header nav:visible").getByRole("link", { name: "링크", exact: true });

test("the line under the title wakes with the account stream and rolls today's people clicks as they land", async ({ page }) => {
  const queue = await liveDashboard(page);
  await page.goto("/ko/dashboard");
  const live = page.getByTestId("live-today");
  await expect(live).toHaveText("오늘 클릭 412");
  await expect(live.locator(".count-roll")).toHaveCount(0);

  queue.push(click("spr1ng", { deviceClass: "Bot", channel: "direct", bot: true }), click("spr1ng"));
  await expect(live).toContainText("오늘 클릭 413", { timeout: 10_000 });
  await expect(live.locator(".count-roll")).toHaveText("오늘 클릭 413");
  await expect(live).toContainText("/spr1ng · KR · iOS · instagram");

  const row = page.locator("li").filter({ hasText: "/spr1ng" }).first();
  await expect(row.locator(".count-roll").filter({ visible: true })).toHaveText("1,285");
  await expect(row.locator(".live-dot-once")).toBeVisible();
  await expect(page.locator(".count-bump, .animate-ping")).toHaveCount(0);

  await page.waitForTimeout(2_500);
  await expect(live).toContainText("오늘 클릭 413");
  await expect(live).not.toContainText("414");
});

test("a hard load draws the rows as they are, with no entry motion", async ({ page }) => {
  await liveDashboard(page);
  await page.goto("/ko/dashboard");
  const seen = await page.waitForFunction(
    () => {
      const rows = [...document.querySelectorAll("li.row-enter")];
      if (rows.length === 0) return null;
      return {
        firstLoad: document.documentElement.hasAttribute("data-first-load"),
        moving: rows.flatMap((li) => li.getAnimations({ subtree: true })).map((a) => (a as CSSAnimation).animationName),
      };
    },
    undefined,
    { polling: "raf" },
  );
  expect(await seen.jsonValue()).toEqual({ firstLoad: true, moving: [] });
});

test("coming in from another screen, the top rows step in one by one and each sparkline draws once", async ({ page }) => {
  await liveDashboard(page);
  await enterFromMore(page);
  const entry = page.waitForFunction(
    () => {
      const rows = [...document.querySelectorAll("li.row-enter")];
      if (rows.length === 0) return null;
      const delay = (el: Element | null, name: string) => {
        const found = el?.getAnimations().find((a) => (a as CSSAnimation).animationName === name);
        return found ? Number((found.effect as KeyframeEffect).getTiming().delay) : null;
      };
      return {
        firstLoad: document.documentElement.hasAttribute("data-first-load"),
        rows: rows.slice(0, 12).map((li) => delay(li, "row-enter")),
        sparks: rows.slice(0, 3).map((li) => delay(li.querySelector(".row-spark.md\\:block polyline"), "spark-draw")),
      };
    },
    undefined,
    { polling: "raf" },
  );
  await linksTab(page).click();
  expect(await (await entry).jsonValue()).toEqual({
    firstLoad: false,
    rows: [0, 35, 70, 105, 140, 175, 210, 245, 280, 315, 350, 350],
    sparks: [120, 155, 190],
  });

  await expect(page.locator("li.row-enter")).toHaveCount(0);
  await page.evaluate(() => {
    const seen = ((window as unknown as { __rowsIn: string[] }).__rowsIn = []);
    new MutationObserver((changes) =>
      changes.forEach((change) =>
        change.addedNodes.forEach((node) => {
          if (node instanceof Element) node.querySelectorAll("li").forEach((li) => seen.push(li.className));
        }),
      ),
    ).observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole("button", { name: /사람 클릭순/ }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __rowsIn: string[] }).__rowsIn.length)).toBeGreaterThan(10);
  expect(await page.evaluate(() => (window as unknown as { __rowsIn: string[] }).__rowsIn.filter((name) => name.includes("row-enter")))).toEqual([]);
});

test("with reduced motion nothing moves: rows come in still and a click changes the numbers at once", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", baseURL: test.info().project.use.baseURL });
  const page = await context.newPage();
  const queue = await liveDashboard(page);
  await enterFromMore(page);
  const entry = page.waitForFunction(
    () => {
      const rows = [...document.querySelectorAll("li.row-enter")];
      return rows.length ? { moving: rows.flatMap((li) => li.getAnimations({ subtree: true })).length } : null;
    },
    undefined,
    { polling: "raf" },
  );
  await linksTab(page).click();
  expect(await (await entry).jsonValue()).toEqual({ moving: 0 });

  const live = page.getByTestId("live-today");
  await expect(live).toHaveText("오늘 클릭 412");
  queue.push(click("spr1ng"));
  await expect(live).toContainText("오늘 클릭 413", { timeout: 10_000 });
  const row = page.locator("li").filter({ hasText: "/spr1ng" }).first();
  await expect(row.locator(".count-roll").filter({ visible: true })).toHaveText("1,285");
  const moving = await page.evaluate(() =>
    [document.querySelector('[data-testid="live-today"]'), [...document.querySelectorAll("li")].find((li) => li.textContent?.includes("/spr1ng"))?.parentElement]
      .flatMap((el) => el?.getAnimations({ subtree: true }) ?? [])
      .map((a) => (a as CSSAnimation).animationName ?? "transition"),
  );
  expect(moving).toEqual([]);
  await context.close();
});
