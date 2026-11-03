import { expect, test, type Page, type Route } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";
import { expectOnTop, toastBy } from "./helpers/on-top";

const DAY = 86_400_000;

function link(shortCode: string) {
  return {
    shortCode,
    shortUrl: `https://kurl.me/${shortCode}`,
    originalUrl: `https://example.com/${shortCode}`,
    note: null,
    createdAt: "2026-09-01T00:00:00Z",
    expiresAt: null,
    clickCount: 3,
    humanClickCount: 3,
    clicksLast7d: [0, 0, 1, 0, 1, 0, 1],
    tags: [],
    timezone: "Asia/Seoul",
  };
}

type Server = { deleted: Map<string, string>; restored: string[]; deleteCalls: string[] };

async function dashboard(
  page: Page,
  codes: string[],
  opts: { restorable?: boolean; deleteDelay?: number; deletedListStatus?: number; restoreError?: { status: number; code: string; limit?: number } } = {},
) {
  const restorable = opts.restorable ?? true;
  const rows = codes.map(link);
  const server: Server = { deleted: new Map(), restored: [], deleteCalls: [] };
  const live = () => rows.filter((r) => !server.deleted.has(r.shortCode));
  await signIn(page);
  await mockBackend(page, {
    "GET /api/v1/links/me": (route: Route) => route.fulfill({ json: { items: live(), hasMore: false, nextCursor: null } }),
    "GET /api/v1/links/me/favorites": (route: Route) => route.fulfill({ json: { items: [], hasMore: false, nextCursor: null } }),
    "GET /api/v1/links/me/overview": (route: Route) =>
      route.fulfill({
        json: {
          humanClicks: 0, totalLinks: live().length, totalClicks: 0, clicks7d: 0, clicksToday: 0, zeroClickLinks: 0, expiringLinks: 0,
          timezone: "Asia/Seoul", updatedAt: "2026-11-04T00:00:00Z", dailyClicks: [], topLinks: [],
          ...(restorable ? { deletedLinks: server.deleted.size } : {}),
        },
      }),
    "GET /api/v1/links/me/deleted": (route: Route) => {
      if (!restorable || opts.deletedListStatus) return route.fulfill({ status: opts.deletedListStatus ?? 404, json: { status: 404 } });
      const items = rows
        .filter((r) => server.deleted.has(r.shortCode))
        .map((r) => {
          const deletedAt = server.deleted.get(r.shortCode)!;
          return { link: r, deletedAt, restorableUntil: new Date(Date.parse(deletedAt) + 30 * DAY).toISOString(), daysLeft: 30 };
        });
      return route.fulfill({ json: { items, hasMore: false, nextCursor: null } });
    },
  });
  await page.route(/\/api\/v1\/links\/[^/]+(\/restore)?$/, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const [, , , , code, action] = url.pathname.split("/");
    if (req.method() === "DELETE" && !action) {
      server.deleteCalls.push(code);
      if (opts.deleteDelay) await new Promise((r) => setTimeout(r, opts.deleteDelay));
      server.deleted.set(code, new Date().toISOString());
      return route.fulfill({ status: 204, body: "" });
    }
    if (req.method() === "POST" && action === "restore") {
      if (!restorable) return route.fulfill({ status: 404, json: { status: 404 } });
      if (opts.restoreError) {
        const { status, code: errorCode, limit } = opts.restoreError;
        return route.fulfill({ status, json: { status, title: "refused", code: errorCode, ...(limit ? { limit } : {}) } });
      }
      server.deleted.delete(code);
      server.restored.push(code);
      return route.fulfill({ json: rows.find((r) => r.shortCode === code) });
    }
    return route.fallback();
  });
  return server;
}

const codesOnScreen = (page: Page) =>
  page.locator("main ul > li").evaluateAll((lis) => lis.map((li) => li.textContent?.match(/\/([a-z0-9]+)/)?.[1] ?? ""));

test.describe("deleting a link can be taken back", () => {
  test("the row leaves at once, the toast offers 되돌리기 for ten seconds, and undo puts it back in place", async ({ page }) => {
    const server = await dashboard(page, ["alpha", "beta", "gamma"], { deleteDelay: 1_500 });
    await page.goto("/ko/dashboard");
    await expect.poll(() => codesOnScreen(page)).toEqual(["alpha", "beta", "gamma"]);

    await page.locator("main li").filter({ hasText: "/beta" }).getByRole("button", { name: "더보기" }).click();
    await page.getByRole("menuitem", { name: "삭제" }).click();
    const dialog = page.getByRole("dialog", { name: "/beta 링크를 삭제할까요?" });
    await expect(dialog).toContainText("30일 동안 최근 삭제에서 되살릴 수 있어요.");
    await dialog.getByRole("button", { name: "삭제" }).click();
    await expect.poll(() => codesOnScreen(page), { timeout: 500 }).toEqual(["alpha", "gamma"]);

    const toast = toastBy(page, "링크를 삭제했어요");
    await expectOnTop(toast);
    await page.waitForTimeout(6_000);
    await expect(toast.getByRole("button", { name: "되돌리기" })).toBeVisible();
    await toast.getByRole("button", { name: "되돌리기" }).click();
    await expect.poll(() => server.restored).toEqual(["beta"]);
    await expect.poll(() => codesOnScreen(page)).toEqual(["alpha", "beta", "gamma"]);
    expect(server.deleteCalls).toEqual(["beta"]);
  });

  test("bulk delete says how many and one undo brings them all back", async ({ page }) => {
    const server = await dashboard(page, ["alpha", "beta", "gamma"]);
    await page.goto("/ko/dashboard");
    await page.getByRole("checkbox", { name: "/alpha 선택" }).check();
    await page.getByRole("checkbox", { name: "/gamma 선택" }).check();
    await page.getByRole("button", { name: "선택 삭제" }).filter({ visible: true }).click();
    const dialog = page.getByRole("dialog", { name: "링크 2개를 삭제할까요?" });
    await expect(dialog).toContainText("30일 동안 최근 삭제에서 되살릴 수 있어요.");
    await dialog.getByRole("button", { name: "선택 삭제" }).click();
    await expect.poll(() => codesOnScreen(page)).toEqual(["beta"]);
    const toast = toastBy(page, "링크 2개를 삭제했어요");
    await expectOnTop(toast);
    await toast.getByRole("button", { name: "되돌리기" }).click();
    await expect.poll(() => [...server.restored].sort()).toEqual(["alpha", "gamma"]);
    await expect.poll(() => codesOnScreen(page)).toEqual(["alpha", "beta", "gamma"]);
  });

  test("recently deleted lists when it was deleted, how long it stays, and restores it", async ({ page }) => {
    const server = await dashboard(page, ["alpha", "beta"]);
    await page.goto("/ko/dashboard");
    await page.locator("main li").filter({ hasText: "/alpha" }).getByRole("button", { name: "더보기" }).click();
    await page.getByRole("menuitem", { name: "삭제" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
    await expect.poll(() => codesOnScreen(page)).toEqual(["beta"]);

    await page.getByRole("button", { name: "최근 삭제", exact: true }).click();
    const row = page.locator("main li").filter({ hasText: "/alpha" });
    await expect(row).toContainText("30일 남음");
    await expect(row).toContainText("삭제");
    await row.getByRole("button", { name: "/alpha 되살리기" }).click();
    await expectOnTop(toastBy(page, "링크를 되살렸어요"));
    await expect.poll(() => server.restored).toEqual(["alpha"]);
    await expect(page.getByText("최근 삭제한 링크가 없어요")).toBeVisible();
  });

  test("an older server keeps today's behavior: no 30-day promise, no undo, no recently deleted", async ({ page }) => {
    await dashboard(page, ["alpha", "beta"], { restorable: false });
    await page.goto("/ko/dashboard");
    await expect(page.locator("main li").filter({ hasText: "/alpha" })).toBeVisible();
    await expect(page.getByRole("button", { name: "최근 삭제", exact: true })).toHaveCount(0);
    await page.locator("main li").filter({ hasText: "/alpha" }).getByRole("button", { name: "더보기" }).click();
    await page.getByRole("menuitem", { name: "삭제" }).click();
    const dialog = page.getByRole("dialog", { name: "/alpha 링크를 삭제할까요?" });
    await expect(dialog).toContainText("삭제된 링크는 복구할 수 없어요.");
    await dialog.getByRole("button", { name: "삭제" }).click();
    const toast = toastBy(page, "링크를 삭제했어요");
    await expectOnTop(toast);
    await expect(toast.getByRole("button", { name: "되돌리기" })).toHaveCount(0);
  });

  test("a refused undo says why and keeps undo available for the next delete", async ({ page }) => {
    await dashboard(page, ["alpha", "beta"], { restoreError: { status: 409, code: "LINK_QUOTA_EXCEEDED", limit: 500 } });
    await page.goto("/ko/dashboard");
    await page.locator("main li").filter({ hasText: "/alpha" }).getByRole("button", { name: "더보기" }).click();
    await page.getByRole("menuitem", { name: "삭제" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
    await toastBy(page, "링크를 삭제했어요").getByRole("button", { name: "되돌리기" }).click();
    await expectOnTop(toastBy(page, "링크 생성 한도(500개)에 도달했어요."));
    await expect(page.getByRole("button", { name: "최근 삭제", exact: true })).toBeVisible();
  });

  test("if the deleted list turns out to be missing, the view steps back to all links", async ({ page }) => {
    await dashboard(page, ["alpha"], { deletedListStatus: 404 });
    await page.goto("/ko/dashboard");
    await page.getByRole("button", { name: "최근 삭제", exact: true }).click();
    await expect(page.getByRole("button", { name: "최근 삭제", exact: true })).toHaveCount(0);
    await expect(page.locator("main li").filter({ hasText: "/alpha" })).toBeVisible();
  });
});
