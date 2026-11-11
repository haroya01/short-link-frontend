import { expect, test, type Page, type Route } from "@playwright/test";
import { mockLinksResponse } from "../lib/api/_links-mocks";
import { ME, mockBackend, signIn } from "./helpers/mock-backend";
import { expectOnTop, toastBy } from "./helpers/on-top";

const ADMIN = { ...ME, role: "ADMIN" };
const CODE = "e2eClk1";
const DESTINATION =
  "https://parcel-redelivery.example/kr/verify?id=88213&step=confirm-address&from=sms-campaign-2026";
const RETENTION = "원본 기록이 남아 있는 클릭만 나와요. 더 오래된 클릭은 합계에만 있어요.";

type Click = {
  id: number;
  excluded: boolean;
  click: Record<string, unknown> & { bot: boolean; botName: string | null };
};

const LINK_ROW = {
  shortCode: CODE,
  originalUrl: DESTINATION,
  ownerId: null,
  ownerEmail: null,
  passwordProtected: false,
  maxViews: null,
  viewCount: 0,
  createdAt: "2026-09-20T00:00:00Z",
  expiresAt: null,
  status: "ACTIVE",
  disabledReason: null,
  disabledAt: null,
};

function human(id: number, over: Record<string, unknown> = {}): Click {
  return {
    id,
    excluded: false,
    click: {
      clickedAt: new Date(Date.UTC(2026, 10, 10, 0, 15, 0) - (2000 - id) * 60_000).toISOString(),
      country: "KR",
      region: "Seoul",
      regionCode: "KR-11",
      city: "Seoul",
      device: "mobile",
      os: "iOS",
      browser: "Safari",
      referrer: null,
      referrerHost: "instagram.com",
      channel: "social",
      language: "ko",
      bot: false,
      botName: null,
      ipMasked: "203.0.113.*",
      ...over,
    },
  };
}

const crawler = (id: number) =>
  human(id, {
    bot: true,
    botName: "preview:slackbot",
    device: "bot",
    os: null,
    browser: null,
    referrerHost: null,
    channel: "direct",
    ipMasked: "198.51.100.*",
  });
const operator = (id: number) => human(id, { bot: true, botName: "preview:operator", ipMasked: "192.0.2.*" });
const excluded = (id: number): Click => ({
  ...human(id, { bot: true, botName: "preview:excluded" }),
  excluded: true,
});

function fakeServer(
  initial: Click[],
  options: { humanCount?: boolean; pageSize?: number; failExcludeFrom?: number } = {},
) {
  const rows = initial;
  const calls = { cursors: [] as (string | null)[], limits: [] as number[], exclude: [] as number[][], restore: [] as number[][] };
  const humans = () => rows.filter((row) => !row.click.bot).length;
  const meta = () => ({
    ...LINK_ROW,
    clickCount: rows.length,
    ...(options.humanCount === false ? {} : { humanClickCount: humans() }),
  });
  const stats = mockLinksResponse(`/api/v1/links/${CODE}/stats`, "GET") as Record<string, unknown>;
  const base = `/api/v1/admin/links/${CODE}`;

  const change = (kind: "exclude" | "restore") => (route: Route) => {
    const ids = (route.request().postDataJSON() as { clickIds: number[] }).clickIds;
    calls[kind].push(ids);
    if (kind === "exclude" && options.failExcludeFrom != null && calls.exclude.length >= options.failExcludeFrom) {
      return route.fulfill({ status: 500, json: { status: 500, title: "Internal Server Error" } });
    }
    let changed = 0;
    for (const row of rows) {
      if (!ids.includes(row.id)) continue;
      if (kind === "exclude" && !row.click.bot) {
        Object.assign(row, { excluded: true });
        Object.assign(row.click, { bot: true, botName: "preview:excluded" });
        changed++;
      } else if (kind === "restore" && row.excluded) {
        Object.assign(row, { excluded: false });
        Object.assign(row.click, { bot: false, botName: null });
        changed++;
      }
    }
    return route.fulfill({ json: { shortCode: CODE, changed } });
  };

  const handlers: Record<string, (route: Route) => unknown> = {
    [`GET ${base}`]: (route) =>
      route.fulfill({ json: { meta: meta(), stats: { ...stats, timezone: "Asia/Seoul" } } }),
    "GET /api/v1/admin/links": (route) => route.fulfill({ json: { items: [meta()], total: 1 } }),
    "GET /api/v1/admin/blocked-domains": (route) => route.fulfill({ json: [] }),
    [`GET ${base}/clicks`]: (route) => {
      const query = new URL(route.request().url()).searchParams;
      const cursor = query.get("cursor");
      const limit = Number(query.get("limit"));
      calls.cursors.push(cursor);
      calls.limits.push(limit);
      const size = options.pageSize ?? limit;
      const older = cursor ? rows.filter((row) => row.id < Number(cursor)) : rows;
      const items = older.slice(0, size);
      const nextCursor = older.length > size ? String(items[items.length - 1].id) : null;
      return route.fulfill({ json: { items, nextCursor } });
    },
    [`POST ${base}/clicks/exclude`]: change("exclude"),
    [`POST ${base}/clicks/restore`]: change("restore"),
  };
  return { handlers, calls, rows };
}

async function signInAsAdmin(page: Page) {
  await signIn(page);
  await page.context().addCookies([{ name: "kurl_has_session", value: "1", domain: "localhost", path: "/" }]);
}

async function openDetail(page: Page, server: ReturnType<typeof fakeServer>) {
  await signInAsAdmin(page);
  await mockBackend(page, server.handlers, ADMIN);
  await page.goto(`/ko/admin/links/${CODE}`);
  await expect(clickSection(page)).toBeVisible();
}

const clickSection = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: "클릭 기록", exact: true }) });
const summary = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: "링크 상세", exact: true }) });
const tableRows = (page: Page) => clickSection(page).locator("tbody tr");
const selectionBar = (page: Page) => page.getByTestId("click-selection-bar");
const rowBox = (page: Page, time: string) =>
  clickSection(page).getByRole("checkbox", { name: `${time} 클릭 선택`, exact: true });
const allBox = (page: Page) =>
  clickSection(page).getByRole("checkbox", { name: "불러온 클릭 전체 선택", exact: true });

test.describe("admin click table", () => {
  test("lists the link's human clicks with the cues to recognise them, and nothing else", async ({ page }) => {
    const server = fakeServer([human(1906), crawler(1905), human(1904), operator(1903), excluded(1902), human(1901)]);
    await openDetail(page, server);

    await expect(tableRows(page)).toHaveCount(3);
    const first = tableRows(page).first();
    await expect(first).toContainText("2026.11.10 07:41:00");
    await expect(first).toContainText("Seoul, 서울특별시, 대한민국");
    await expect(first).toContainText("모바일 · iOS · Safari");
    await expect(first).toContainText("instagram.com");
    await expect(first).toContainText("203.0.113.*");
    await expect(clickSection(page)).not.toContainText("198.51.100.*");
    await expect(clickSection(page)).not.toContainText("192.0.2.*");
    await expect(clickSection(page).getByText("Asia/Seoul", { exact: true })).toBeVisible();
    await expect(clickSection(page).getByText(RETENTION, { exact: true })).toBeVisible();
    expect(server.calls.cursors[0]).toBeNull();
    expect(server.calls.limits[0]).toBeGreaterThan(0);
    expect(server.calls.limits[0]).toBeLessThanOrEqual(200);
  });

  test("excluding the selected clicks sends their ids and drops the summary number while the table stays", async ({
    page,
  }) => {
    const server = fakeServer([human(1906), crawler(1905), human(1904), human(1903), excluded(1902)]);
    await openDetail(page, server);

    await expect(page.getByTestId("admin-link-clicks")).toHaveText("3");
    await expect(summary(page)).toContainText("전체 5");
    await clickSection(page).evaluate((el) => el.setAttribute("data-kept", "1"));

    await rowBox(page, "2026.11.10 07:41:00").check();
    await rowBox(page, "2026.11.10 07:38:00").check();
    await expect(selectionBar(page)).toContainText("2건 선택됨");
    await expectOnTop(selectionBar(page).getByRole("button", { name: "제외", exact: true }));
    const scrolled = await page.evaluate(() => window.scrollY);
    expect(scrolled).toBeGreaterThan(0);
    const listReads = server.calls.cursors.length;

    await selectionBar(page).getByRole("button", { name: "제외", exact: true }).click();

    await expectOnTop(toastBy(page, "2건을 제외했어요"));
    expect(server.calls.exclude).toEqual([[1906, 1903]]);
    await expect(page.getByTestId("admin-link-clicks")).toHaveText("1");
    await expect(summary(page)).toContainText("전체 5");
    await expect(tableRows(page)).toHaveCount(1);
    await expect(tableRows(page).first()).toContainText("2026.11.10 07:39:00");
    await expect(selectionBar(page)).toHaveCount(0);
    await expect(clickSection(page)).toHaveAttribute("data-kept", "1");
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect(server.calls.cursors).toHaveLength(listReads);
  });

  test("the result reports what the server changed, not how many rows were selected", async ({ page }) => {
    const server = fakeServer([human(1906), human(1905), human(1904), human(1903)]);
    await openDetail(page, server);
    await expect(tableRows(page)).toHaveCount(4);

    const takenElsewhere = (id: number) => {
      const row = server.rows.find((r) => r.id === id)!;
      Object.assign(row, { excluded: true });
      Object.assign(row.click, { bot: true, botName: "preview:excluded" });
    };
    takenElsewhere(1905);
    await rowBox(page, "2026.11.10 07:41:00").check();
    await rowBox(page, "2026.11.10 07:40:00").check();
    await selectionBar(page).getByRole("button", { name: "제외", exact: true }).click();

    await expectOnTop(toastBy(page, "1건을 제외했어요"));
    expect(server.calls.exclude).toEqual([[1906, 1905]]);
    await expect(tableRows(page)).toHaveCount(2);
    await expect(page.getByTestId("admin-link-clicks")).toHaveText("2");

    takenElsewhere(1904);
    await rowBox(page, "2026.11.10 07:39:00").check();
    await selectionBar(page).getByRole("button", { name: "제외", exact: true }).click();

    await expectOnTop(toastBy(page, "이미 제외된 클릭이에요"));
    await expect(tableRows(page)).toHaveCount(1);
    await expect(page.getByTestId("admin-link-clicks")).toHaveText("1");
  });

  test("shift-click selects a range, the header box goes mixed then full, and a view change clears it", async ({
    page,
  }) => {
    const server = fakeServer([human(1910), human(1909), human(1908), human(1907), human(1906), excluded(1905)]);
    await openDetail(page, server);

    await rowBox(page, "2026.11.10 07:45:00").check();
    await rowBox(page, "2026.11.10 07:42:00").click({ modifiers: ["Shift"] });
    await expect(selectionBar(page)).toContainText("4건 선택됨");
    const mixed = () => allBox(page).evaluate((el) => (el as HTMLInputElement).indeterminate);
    expect(await mixed()).toBe(true);
    await expect(allBox(page)).not.toBeChecked();

    await allBox(page).click();
    await expect(selectionBar(page)).toContainText("5건 선택됨");
    expect(await mixed()).toBe(false);
    await expect(allBox(page)).toBeChecked();

    await clickSection(page).getByRole("button", { name: "제외됨", exact: true }).click();
    await expect(selectionBar(page)).toHaveCount(0);
    await expect(tableRows(page)).toHaveCount(1);
    await clickSection(page).getByRole("button", { name: "사람 클릭", exact: true }).click();
    await expect(tableRows(page)).toHaveCount(5);
    await expect(clickSection(page).getByRole("checkbox", { checked: true })).toHaveCount(0);
  });

  test("the excluded view shows what was taken out and puts it back", async ({ page }) => {
    const server = fakeServer([human(1906), excluded(1905), excluded(1904), crawler(1903)]);
    await openDetail(page, server);
    await expect(page.getByTestId("admin-link-clicks")).toHaveText("1");

    await clickSection(page).getByRole("button", { name: "제외됨", exact: true }).click();
    await expect(tableRows(page)).toHaveCount(2);
    await expect(tableRows(page).first()).toContainText("모바일 · iOS · Safari");

    await allBox(page).click();
    await expect(selectionBar(page)).toContainText("2건 선택됨");
    await selectionBar(page).getByRole("button", { name: "되돌리기", exact: true }).click();

    await expectOnTop(toastBy(page, "2건을 되돌렸어요"));
    expect(server.calls.restore).toEqual([[1905, 1904]]);
    expect(server.calls.exclude).toEqual([]);
    await expect(page.getByTestId("admin-link-clicks")).toHaveText("3");
    await expect(clickSection(page).getByText("제외한 클릭이 없어요", { exact: true })).toBeVisible();

    await clickSection(page).getByRole("button", { name: "사람 클릭", exact: true }).click();
    await expect(tableRows(page)).toHaveCount(3);
  });

  test("pages that hold only bots are read through until a human click shows", async ({ page }) => {
    const server = fakeServer(
      [crawler(1920), crawler(1919), crawler(1918), crawler(1917), human(1916), crawler(1915), human(1914)],
      { pageSize: 2 },
    );
    await openDetail(page, server);

    await expect(tableRows(page)).toHaveCount(1);
    expect(server.calls.cursors).toEqual(expect.arrayContaining([null, "1919", "1917"]));
    expect(server.calls.cursors).not.toContain("1915");
    await expect(clickSection(page).getByText("아직 사람 클릭이 없어요")).toHaveCount(0);

    await clickSection(page).getByRole("button", { name: "더 보기", exact: true }).click();
    await expect(tableRows(page)).toHaveCount(2);
    await expect(clickSection(page).getByRole("button", { name: "더 보기", exact: true })).toHaveCount(0);
  });

  test("a long run of bots never reads as empty while older clicks remain", async ({ page }) => {
    const bots = Array.from({ length: 12 }, (_, i) => crawler(1930 - i));
    const server = fakeServer([...bots, human(1910)], { pageSize: 2 });
    await openDetail(page, server);

    await expect(clickSection(page).getByText("지금까지 읽은 10건에는 없어요", { exact: true })).toBeVisible();
    await expect(clickSection(page).getByText("아직 사람 클릭이 없어요")).toHaveCount(0);
    expect(server.calls.cursors).toContain("1923");
    expect(server.calls.cursors).not.toContain("1921");

    await clickSection(page).getByRole("button", { name: "더 보기", exact: true }).click();
    await expect(tableRows(page)).toHaveCount(1);
  });

  test("a link with no clicks says so", async ({ page }) => {
    await openDetail(page, fakeServer([]));

    await expect(clickSection(page).getByText("아직 사람 클릭이 없어요", { exact: true })).toBeVisible();
    await expect(clickSection(page).getByRole("button", { name: "더 보기", exact: true })).toHaveCount(0);
  });

  test("a failed load offers a retry inside the section and leaves the rest of the page alone", async ({ page }) => {
    const server = fakeServer([human(1906)]);
    const load = server.handlers[`GET /api/v1/admin/links/${CODE}/clicks`];
    let failing = true;
    server.handlers[`GET /api/v1/admin/links/${CODE}/clicks`] = (route) =>
      failing ? route.fulfill({ status: 500, json: { status: 500, title: "Internal Server Error" } }) : load(route);
    await openDetail(page, server);

    await expect(clickSection(page).getByText("클릭 기록을 불러오지 못했어요", { exact: true })).toBeVisible();
    await expect(page.getByTestId("admin-link-clicks")).toHaveText("1");
    failing = false;
    await clickSection(page).getByRole("button", { name: "다시 시도", exact: true }).click();
    await expect(tableRows(page)).toHaveCount(1);
  });

  test("more than 200 selected clicks go out 200 at a time, and a failed batch reloads the table from the server", async ({
    page,
  }) => {
    const server = fakeServer(
      Array.from({ length: 250 }, (_, i) => human(1250 - i)),
      { failExcludeFrom: 2 },
    );
    await openDetail(page, server);

    await expect(tableRows(page)).toHaveCount(100);
    await clickSection(page).getByRole("button", { name: "더 보기", exact: true }).click();
    await expect(tableRows(page)).toHaveCount(200);
    await clickSection(page).getByRole("button", { name: "더 보기", exact: true }).click();
    await expect(tableRows(page)).toHaveCount(250);

    await allBox(page).click();
    await expect(selectionBar(page)).toContainText("250건 선택됨");
    await tableRows(page).last().scrollIntoViewIfNeeded();
    await expectOnTop(selectionBar(page).getByRole("button", { name: "제외", exact: true }));
    const listReads = server.calls.cursors.length;
    await selectionBar(page).getByRole("button", { name: "제외", exact: true }).click();

    await expectOnTop(toastBy(page, "200건만 제외했어요. 나머지는 다시 시도해 주세요."));
    expect(server.calls.exclude.map((ids) => ids.length)).toEqual([200, 50]);
    expect(server.calls.exclude[0][0]).toBe(1250);
    expect(server.calls.exclude[1][0]).toBe(1050);
    await expect(tableRows(page)).toHaveCount(50);
    await expect(page.getByTestId("admin-link-clicks")).toHaveText("50");
    expect(server.calls.cursors.slice(listReads)).toEqual([null, "1151", "1051"]);
  });
});

test.describe("admin link numbers and destination", () => {
  test("the detail summary leads with human clicks and shows the destination as text", async ({ page }) => {
    await openDetail(page, fakeServer([human(1906), crawler(1905), human(1904)]));

    await expect(summary(page).getByText("사람 클릭", { exact: true })).toBeVisible();
    await expect(page.getByTestId("admin-link-clicks")).toHaveText("2");
    await expect(summary(page).getByText("전체 3", { exact: true })).toBeVisible();

    const destination = summary(page).locator(`[title="${DESTINATION}"]`);
    await expect(destination).toBeVisible();
    await expect(destination).toContainText("…");
    expect(await destination.evaluate((el) => el.tagName)).toBe("SPAN");
    await expect(page.locator(`a[href*="parcel-redelivery"]`)).toHaveCount(0);
  });

  test("a backend without humanClickCount still renders, with the one total it has", async ({ page }) => {
    const server = fakeServer([human(1906), crawler(1905), human(1904)], { humanCount: false });
    await openDetail(page, server);

    await expect(summary(page).getByText("총 클릭", { exact: true })).toBeVisible();
    await expect(page.getByTestId("admin-link-clicks")).toHaveText("3");
    await expect(summary(page).getByText(/전체/)).toHaveCount(0);
    await expect(tableRows(page)).toHaveCount(2);

    await page.goto("/ko/admin/links");
    const row = page.getByRole("row").filter({ hasText: `/${CODE}` });
    await expect(row).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "클릭", exact: true })).toBeVisible();
    await expect(row.getByRole("cell", { name: "3", exact: true })).toBeVisible();
    await expect(row.getByText(/전체/)).toHaveCount(0);
  });

  test("the link list leads with human clicks, keeps the total under it, and shows the destination as text", async ({
    page,
  }) => {
    const server = fakeServer([human(1906), crawler(1905), human(1904)]);
    await signInAsAdmin(page);
    await mockBackend(page, server.handlers, ADMIN);
    await page.goto("/ko/admin/links");

    const row = page.getByRole("row").filter({ hasText: `/${CODE}` });
    await expect(page.getByRole("columnheader", { name: "사람 클릭", exact: true })).toBeVisible();
    await expect(row.getByText("2", { exact: true })).toBeVisible();
    await expect(row.getByText("전체 3", { exact: true })).toBeVisible();

    const destination = row.locator(`[title="${DESTINATION}"]`);
    await expect(destination).toBeVisible();
    expect(await destination.evaluate((el) => el.tagName)).toBe("SPAN");
    await expect(page.locator(`a[href*="parcel-redelivery"]`)).toHaveCount(0);
  });
});

test.describe("admin click table on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("rows stack, the action stays in reach, and nothing scrolls sideways", async ({ page }) => {
    const server = fakeServer([human(1906), crawler(1905), human(1904), human(1903)]);
    await openDetail(page, server);

    const items = clickSection(page).locator("ul > li");
    await expect(items).toHaveCount(3);
    await expect(clickSection(page).locator("table")).toBeHidden();
    await expect(items.first()).toContainText("203.0.113.*");

    await rowBox(page, "2026.11.10 07:41:00").check();
    await expect(selectionBar(page)).toContainText("1건 선택됨");
    await expectOnTop(selectionBar(page).getByRole("button", { name: "제외", exact: true }));
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(0);

    await selectionBar(page).getByRole("button", { name: "제외", exact: true }).click();
    await expectOnTop(toastBy(page, "1건을 제외했어요"));
    expect(server.calls.exclude).toEqual([[1906]]);
    await expect(items).toHaveCount(2);
  });
});
