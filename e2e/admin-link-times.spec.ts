import fs from "fs";
import path from "path";
import { expect, test, type Page, type Route } from "@playwright/test";
import { mockLinksResponse } from "../lib/api/_links-mocks";
import { ME, mockBackend, signIn } from "./helpers/mock-backend";

const ADMIN = { ...ME, role: "ADMIN" };
const CODE = "e2eTime1";
const BLURRED = fs.readFileSync(path.join(__dirname, "fixtures/preview-blurred.jpg"));

const META = {
  shortCode: CODE,
  originalUrl: "https://prize.example/claim",
  ownerId: 7,
  ownerEmail: "owner@example.com",
  clickCount: 1,
  humanClickCount: 1,
  passwordProtected: false,
  maxViews: null,
  viewCount: 0,
  createdAt: "2026-09-20T00:00:00Z",
  expiresAt: null,
  status: "ACTIVE",
  disabledReason: "ADMIN",
  disabledAt: "2026-09-30T03:00:00Z",
};

const EVIDENCE = {
  page: {
    title: "Claim your prize today",
    description: null,
    fetchStatus: "OK",
    fetchedAt: "2026-11-10T05:02:00Z",
    hasImage: true,
    imageWithheld: false,
  },
  destinations: [
    { host: "prize.example", kind: "ORIGINAL", weight: null, countryCode: null, deviceClass: null, os: null },
  ],
  history: {
    retentionDays: 180,
    urlChanges: 1,
    destinationChanges: 0,
    latest: { action: "LINK_UPDATED", at: "2026-11-09T12:14:00Z", fromHost: "safe.example", toHost: "prize.example" },
  },
  creator: {
    anonymous: false,
    userId: 7,
    joinedAt: "2026-11-01T03:00:00Z",
    status: "SUSPENDED",
    suspendedUntil: "2026-12-01T03:00:00Z",
    links: 12,
    disabledLinks: 0,
  },
  reports: { total: 0, open: 0, reasons: [] },
};

const CLICK = {
  id: 701,
  excluded: false,
  click: {
    clickedAt: "2026-11-10T00:15:00Z",
    country: "KR",
    region: null,
    regionCode: null,
    city: "Seoul",
    device: "mobile",
    os: "iOS",
    browser: "Safari",
    referrer: null,
    referrerHost: null,
    channel: "direct",
    language: "ko",
    bot: false,
    botName: null,
    ipMasked: "203.0.113.*",
  },
};

async function open(page: Page) {
  const stats = mockLinksResponse(`/api/v1/links/${CODE}/stats`, "GET") as Record<string, unknown>;
  const base = `/api/v1/admin/links/${CODE}`;
  const handlers: Record<string, (route: Route) => unknown> = {
    [`GET ${base}`]: (route) =>
      route.fulfill({ json: { meta: META, stats: { ...stats, timezone: "Asia/Seoul" }, evidence: EVIDENCE } }),
    "GET /api/v1/admin/blocked-domains": (route) => route.fulfill({ json: [] }),
    [`GET ${base}/clicks`]: (route) => route.fulfill({ json: { items: [CLICK], nextCursor: null } }),
    [`GET ${base}/preview-image`]: (route) => route.fulfill({ contentType: "image/jpeg", body: BLURRED }),
  };
  await signIn(page);
  await page.context().addCookies([{ name: "kurl_has_session", value: "1", domain: "localhost", path: "/" }]);
  await mockBackend(page, handlers, ADMIN);
  await page.goto(`/ko/admin/links/${CODE}`);
}

const section = (page: Page, title: string) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: title, exact: true }) });

// Two zones on either side of UTC: a time drawn in the server's zone, wherever the server runs, is wrong in at least one.
// Korean AM/PM reads 오전/오후 or AM/PM depending on the browser's ICU version; both are accepted.
for (const viewer of [
  {
    zone: "Asia/Seoul",
    fetched: /2026\. 11\. 10\. (오후|PM) 2:02에 가져옴/,
    changed: /마지막 변경 2026\. 11\. 9\. (오후|PM) 9:14/,
    joined: "2026. 11. 1. 가입",
    until: "2026. 12. 1.까지 정지",
    switchedOff: /^꺼짐 · 관리자 · 2026\. 9\. 30\. (오후|PM) 12:00$/,
  },
  {
    zone: "America/New_York",
    fetched: /2026\. 11\. 10\. (오전|AM) 12:02에 가져옴/,
    changed: /마지막 변경 2026\. 11\. 9\. (오전|AM) 7:14/,
    joined: "2026. 10. 31. 가입",
    until: "2026. 11. 30.까지 정지",
    switchedOff: /^꺼짐 · 관리자 · 2026\. 9\. 29\. (오후|PM) 11:00$/,
  },
]) {
  test.describe(`admin link detail times for a viewer in ${viewer.zone}`, () => {
    test.use({ timezoneId: viewer.zone });

    test("the evidence card and the switched-off notice use the viewer's clock, the click log keeps the link's", async ({
      page,
    }) => {
      await open(page);

      const evidence = section(page, "판단 근거");
      await expect(evidence).toContainText(viewer.fetched);
      await expect(evidence).toContainText(viewer.changed);
      await expect(evidence).toContainText(viewer.joined);
      await expect(evidence.getByText(viewer.until, { exact: true })).toBeVisible();

      await expect(section(page, "악용 대응").getByText(viewer.switchedOff)).toBeVisible();

      const clicks = section(page, "클릭 기록");
      await expect(clicks.getByText("Asia/Seoul", { exact: true })).toBeVisible();
      await expect(clicks.locator("tbody tr")).toHaveText([/2026\.11\.10 09:15:00/]);
    });
  });
}
