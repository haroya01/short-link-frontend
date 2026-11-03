import { expect, test, type Page, type Route } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

const DAY = 86_400_000;

function link(shortCode: string, over: Record<string, unknown> = {}) {
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
    ...over,
  };
}

type Row = ReturnType<typeof link>;

function overview(rows: Row[]) {
  return {
    humanClicks: 0, totalLinks: rows.length, totalClicks: 0, clicks7d: 0, clicksToday: 0, zeroClickLinks: 0,
    expiringLinks: rows.filter((r) => r.expiresAt && +new Date(r.expiresAt as string) - Date.now() < 3 * DAY).length,
    timezone: "Asia/Seoul", updatedAt: "2026-09-23T00:00:00Z", dailyClicks: [], topLinks: [],
  };
}

const later = (ms: number, fn: () => Promise<void>) =>
  new Promise<void>((resolve) => setTimeout(() => void fn().catch(() => undefined).then(resolve), ms));

async function dashboard(
  page: Page,
  rows: Row[],
  opts: { listDelay?: number; overviewDelay?: number; overviewStatus?: number; onList?: (url: URL) => void } = {},
) {
  await signIn(page);
  await mockBackend(page, {
    "GET /api/v1/links/me": (route: Route) => {
      const url = new URL(route.request().url());
      opts.onList?.(url);
      const q = url.searchParams.get("q")?.toLowerCase();
      const domain = url.searchParams.get("domain");
      const items = rows.filter(
        (r) => (!q || `${r.note} ${r.shortCode} ${r.originalUrl}`.toLowerCase().includes(q)) && (!domain || r.originalUrl.includes(domain)),
      );
      return later(opts.listDelay ?? 0, () => route.fulfill({ json: { items, hasMore: false, nextCursor: null } }));
    },
    "GET /api/v1/links/me/favorites": (route: Route) => route.fulfill({ json: { items: [], hasMore: false, nextCursor: null } }),
    "GET /api/v1/links/me/overview": (route: Route) =>
      later(opts.overviewDelay ?? 0, () =>
        opts.overviewStatus
          ? route.fulfill({ status: opts.overviewStatus, json: { status: opts.overviewStatus, title: "fail" } })
          : route.fulfill({ json: overview(rows) }),
      ),
  });
}

async function watchShifts(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

const row = (page: Page, code: string) => page.locator("main li").filter({ hasText: `/${code}` }).first();

test.describe("dashboard first impression", () => {
  test("a new account sees one plain line, never a search miss, while the overview is slow", async ({ page }) => {
    await dashboard(page, [], { overviewDelay: 2_000 });
    await page.goto("/ko/dashboard");
    await expect(page.getByText("아직 만든 링크가 없어요")).toBeVisible();
    await expect(page.getByText("검색 결과가 없어요")).toHaveCount(0);
    await expect(page.getByText("예시")).toHaveCount(0);
  });

  test("a new account still sees the plain line when the overview fails", async ({ page }) => {
    await dashboard(page, [], { overviewStatus: 500 });
    await page.goto("/ko/dashboard");
    await expect(page.getByText("아직 만든 링크가 없어요")).toBeVisible();
    await expect(page.getByText(/결과가 없어요|조건에 맞는/)).toHaveCount(0);
  });

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`the list doesn't move when slow responses arrive (${viewport.width}px)`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await watchShifts(page);
      const rows = [link("soon1", { note: "Ends tomorrow", expiresAt: new Date(Date.now() + DAY).toISOString() }), link("plain1"), link("plain2")];
      await dashboard(page, rows, { listDelay: 1_200, overviewDelay: 2_400 });
      await page.goto("/ko/dashboard");
      await expect(row(page, "plain2")).toBeVisible();
      await expect(page.getByRole("button", { name: "3일 안에 만료 1개" })).toBeVisible();
      await page.waitForTimeout(300);
      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
      expect(cls).toBeLessThan(0.01);
    });
  }

  test("clearing the filters leaves the search box and the list saying the same thing", async ({ page }) => {
    const asked: string[] = [];
    await dashboard(page, [link("alpha", { originalUrl: "https://alpha.example.org/a" }), link("beta", { originalUrl: "https://beta.example.com/b" })], {
      onList: (url) => asked.push(url.search),
    });
    await page.goto("/ko/dashboard");
    const search = page.getByRole("searchbox");
    await search.fill("alpha");
    await expect.poll(() => asked.some((s) => s.includes("q=alpha"))).toBe(true);
    await page.getByRole("button", { name: /^필터( \d+)?$/ }).click();
    await page.getByLabel("도메인").fill("example.org");
    await expect.poll(() => asked.some((s) => s.includes("domain=example.org"))).toBe(true);
    await page.getByRole("button", { name: "필터 모두 지우기" }).click();
    await expect(page.getByRole("button", { name: "필터 모두 지우기" })).toHaveCount(0);
    await expect(search).toHaveValue("alpha");
    await expect(row(page, "alpha")).toBeVisible();
    await expect(row(page, "beta")).toHaveCount(0);
  });

  test("typing a domain filter asks once, not once per letter", async ({ page }) => {
    const asked: string[] = [];
    await dashboard(page, [link("alpha")], { onList: (url) => asked.push(url.search) });
    await page.goto("/ko/dashboard");
    await expect(row(page, "alpha")).toBeVisible();
    await page.getByRole("button", { name: /^필터/ }).click();
    const before = asked.length;
    await page.getByLabel("도메인").pressSequentially("example.org", { delay: 40 });
    await expect.poll(() => asked.filter((s) => s.includes("domain=example.org")).length).toBe(1);
    expect(asked.length - before).toBeLessThanOrEqual(2);
  });

  test("the click sort shows which way it runs", async ({ page }) => {
    await dashboard(page, [link("alpha")]);
    await page.goto("/ko/dashboard");
    const sort = page.getByRole("button", { name: /사람 클릭순/ });
    await sort.click();
    await expect(sort.locator("svg.lucide-arrow-down")).toHaveCount(1);
    await sort.click();
    await expect(sort.locator("svg.lucide-arrow-up")).toHaveCount(1);
  });

  test("a seven-digit click count stays on one line on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await dashboard(page, [link("big1", { note: "Launch", humanClickCount: 1_234_567, clickCount: 1_300_000 })]);
    await page.goto("/ko/dashboard");
    const count = row(page, "big1").getByText("1,234,567").filter({ visible: true });
    await expect(count).toBeVisible();
    expect((await count.boundingBox())!.height).toBeLessThan(30);
  });

  test("a search miss names the search and clears it in one tap", async ({ page }) => {
    await dashboard(page, [link("alpha")]);
    await page.goto("/ko/dashboard");
    await page.getByRole("searchbox").fill("nothing-here");
    await expect(page.getByText("“nothing-here” 검색 결과가 없어요")).toBeVisible();
    await page.locator("main").getByRole("button", { name: "검색어 지우기" }).last().click();
    await expect(page.getByRole("searchbox")).toHaveValue("");
    await expect(row(page, "alpha")).toBeVisible();
  });

  test("CSV upload is a real dialog: focus moves in and Escape closes it", async ({ page }) => {
    await dashboard(page, [link("alpha")]);
    await page.goto("/ko/dashboard");
    await page.getByRole("button", { name: "CSV 업로드" }).filter({ visible: true }).click();
    const dialog = page.getByRole("dialog", { name: "CSV로 일괄 등록" });
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("the row menu and the phone sheet offer the same QR and settings", async ({ page }) => {
    await dashboard(page, [link("alpha")]);
    await page.goto("/ko/dashboard");
    await row(page, "alpha").getByRole("button", { name: "더보기" }).click();
    await expect(page.getByRole("menuitem", { name: "QR 코드" })).toBeVisible();
    await page.getByRole("menuitem", { name: "링크 설정" }).click();
    await expect(page).toHaveURL(/\/ko\/stats\/alpha#settings$/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ko/dashboard");
    await page.getByRole("button", { name: /example\.com/ }).first().click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("button", { name: "QR" })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "링크 설정" })).toHaveAttribute("href", /\/ko\/stats\/alpha#settings$/);
  });

  test("on a phone, selecting swaps the shorten bar for the bulk actions", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await dashboard(page, [link("alpha"), link("beta")]);
    await page.goto("/ko/dashboard");
    await expect(page.getByRole("textbox", { name: "긴 주소 붙여넣기" })).toBeVisible();
    await page.getByRole("button", { name: "선택", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "긴 주소 붙여넣기" })).toBeHidden();
    await page.getByRole("checkbox", { name: "/alpha 선택" }).check();
    await expect(page.getByText("1개 선택됨").filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "선택 삭제" })).toBeEnabled();
    await page.getByRole("button", { name: "완료", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "긴 주소 붙여넣기" })).toBeVisible();
  });

  test("an empty phone shorten bar answers with the same message as the landing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await dashboard(page, [link("alpha")]);
    await page.goto("/ko/dashboard");
    await page.getByRole("button", { name: "단축", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "URL을 입력해 주세요." })).toBeVisible();
  });

  test("a fresh link is announced and delete names the link it removes", async ({ page }) => {
    await dashboard(page, [link("alpha")]);
    await mockBackend(page, {
      "POST /api/v1/links": (route: Route) => route.fulfill({ status: 201, json: { shortCode: "fresh1", shortUrl: "https://kurl.me/fresh1", claimToken: null } }),
      "GET /api/v1/links/me": (route: Route) => route.fulfill({ json: { items: [link("alpha")], hasMore: false, nextCursor: null } }),
    });
    await page.goto("/ko/dashboard");
    await page.getByPlaceholder("긴 주소 붙여넣기").filter({ visible: true }).fill("https://example.com/fresh");
    await page.getByRole("button", { name: "단축하기" }).click();
    await expect(page.getByRole("status").filter({ hasText: "kurl.me/fresh1" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /다른 주소도 줄이기/ })).toHaveText("다른 주소도 줄이기");

    await row(page, "alpha").getByRole("button", { name: "더보기" }).click();
    await page.getByRole("menuitem", { name: "삭제" }).click();
    await expect(page.getByRole("dialog", { name: "/alpha 링크를 삭제할까요?" })).toBeVisible();
  });

  test("a visitor on a phone can switch the language from the footer", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ko");
    await page.getByRole("contentinfo").getByRole("button", { name: /한국어/ }).click();
    await page.getByRole("menuitem", { name: /English/ }).click();
    await expect(page).toHaveURL(/\/en(\/|$)/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Shorten in one line/);
  });
});
