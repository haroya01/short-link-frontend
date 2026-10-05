import { expect, test, type Page } from "@playwright/test";
import { mockLinksResponse } from "../lib/api/_links-mocks";
import { ME, mockBackend, signIn } from "./helpers/mock-backend";

const ADMIN = { ...ME, role: "ADMIN" };
const CODE = "e2eOff1";
const DESTINATION = "https://parcel-redelivery.example/kr/verify?id=88213";

async function signInAsAdmin(page: Page) {
  await signIn(page);
  await page.context().addCookies([
    { name: "kurl_has_session", value: "1", domain: "localhost", path: "/" },
  ]);
}

async function acceptCookies(page: Page) {
  await page.context().addInitScript(() => {
    window.localStorage.setItem("kurl:cookie-consent:v1", "accepted");
  });
}

const LINK_REPORT = {
  id: 7001,
  reporterUserId: null,
  subjectType: "LINK",
  subjectId: 9301,
  reasonCode: "PHISHING",
  detail: "택배 문자에 들어 있던 링크",
  status: "OPEN",
  adminNote: null,
  createdAt: "2026-10-01T05:51:00.000Z",
  resolvedAt: null,
  subjectTitle: CODE,
  subjectAuthorHandle: null,
  subjectUrl: null,
  subjectExcerpt: DESTINATION,
  subjectRemoved: false,
};

const ADMIN_LINK_ROW = {
  shortCode: CODE,
  originalUrl: DESTINATION,
  ownerId: null,
  ownerEmail: null,
  clickCount: 3,
  passwordProtected: false,
  maxViews: null,
  viewCount: 0,
  createdAt: "2026-09-20T00:00:00Z",
  expiresAt: null,
  status: "ACTIVE",
  disabledReason: null,
  disabledAt: null,
};

test.describe("link report form", () => {
  test("someone who received a link reports it without an account", async ({ page }) => {
    await acceptCookies(page);
    let sent: unknown;
    await mockBackend(page, {
      "POST /api/v1/public/abuse-reports/links": (route) => {
        sent = route.request().postDataJSON();
        return route.fulfill({ status: 202, body: "" });
      },
    });
    const pasted = `https://kurl.me/${CODE}?src=sms`;
    await page.goto(`/ko/report?link=${encodeURIComponent(pasted)}`);

    await expect(page.getByText(`kurl.me/${CODE}`, { exact: true })).toBeVisible();
    const submit = page.getByRole("button", { name: "신고 보내기" });
    await expect(submit).toBeDisabled();
    await page.getByLabel("피싱·사기").check();
    await page.getByLabel("자세한 상황 (선택)").fill("택배 문자");
    await submit.click();

    await expect(page.getByRole("status").filter({ hasText: "신고를 받았어요" })).toBeVisible();
    expect(sent).toEqual({ link: pasted, reasonCode: "PHISHING", detail: "택배 문자" });
  });

  test("an address without a short code can't be sent", async ({ page }) => {
    await acceptCookies(page);
    await mockBackend(page);
    await page.goto("/ko/report");

    const field = page.getByLabel("신고할 링크");
    await field.fill("https://kurl.me/ko/report");
    await field.blur();
    await page.getByLabel("악성 코드").check();

    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("kurl 단축 링크를 찾지 못했어요.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "신고 보내기" })).toBeDisabled();
  });

  test("a link that isn't on kurl is called out and the form stays", async ({ page }) => {
    await acceptCookies(page);
    await mockBackend(page, {
      "POST /api/v1/public/abuse-reports/links": (route) =>
        route.fulfill({
          status: 404,
          json: { status: 404, code: "SUBJECT_NOT_FOUND", detail: "reported subject not found" },
        }),
    });
    await page.goto("/ko/report");

    await page.getByLabel("신고할 링크").fill("kurl.me/nosuch42");
    await page.getByLabel("악성 코드").check();
    await page.getByRole("button", { name: "신고 보내기" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "kurl에 없는" })).toHaveText(
      "kurl에 없는 링크예요. 주소를 다시 확인해 주세요.",
    );
    await expect(page.getByLabel("신고할 링크")).toHaveValue("kurl.me/nosuch42");
  });
});

test.describe("switching a link off", () => {
  test("a link report names the code, shows the destination as text, and can switch it off", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    let resolved: unknown;
    await mockBackend(
      page,
      {
        "GET /api/v1/admin/abuse-reports": (route) => route.fulfill({ json: [LINK_REPORT] }),
        [`POST /api/v1/admin/abuse-reports/${LINK_REPORT.id}/resolve`]: (route) => {
          resolved = route.request().postDataJSON();
          return route.fulfill({
            json: {
              ...LINK_REPORT,
              status: "RESOLVED",
              resolvedAt: "2026-10-01T06:00:00.000Z",
              subjectRemoved: true,
            },
          });
        },
      },
      ADMIN,
    );
    page.on("dialog", (dialog) => void dialog.accept());
    await page.goto("/ko/admin/abuse-reports");

    const row = page.getByRole("row").filter({ hasText: `/${CODE}` });
    await expect(row.getByRole("link", { name: `/${CODE}` })).toHaveAttribute(
      "href",
      `/ko/admin/links/${CODE}`,
    );
    await expect(row.getByText(DESTINATION)).toBeVisible();
    await expect(row.locator(`a[href*="parcel-redelivery"]`)).toHaveCount(0);

    await row.getByRole("button", { name: "링크 끄기" }).click();
    await expect(row.getByText("꺼짐", { exact: true })).toBeVisible();
    expect(resolved).toMatchObject({ resolution: "RESOLVED", action: "DISABLE_LINK" });
  });

  test("an admin switches a link off and back on from its page", async ({ page }) => {
    await signInAsAdmin(page);
    const calls: string[] = [];
    await mockBackend(
      page,
      {
        [`GET /api/v1/admin/links/${CODE}`]: (route) =>
          route.fulfill({
            json: {
              meta: ADMIN_LINK_ROW,
              stats: mockLinksResponse(`/api/v1/links/${CODE}/stats`, "GET"),
            },
          }),
        "GET /api/v1/admin/blocked-domains": (route) => route.fulfill({ json: [] }),
        [`POST /api/v1/admin/links/${CODE}/disable`]: (route) => {
          calls.push("disable");
          return route.fulfill({ json: { shortCode: CODE, disabled: true, changed: true } });
        },
        [`POST /api/v1/admin/links/${CODE}/enable`]: (route) => {
          calls.push("enable");
          return route.fulfill({ json: { shortCode: CODE, disabled: false, changed: true } });
        },
      },
      ADMIN,
    );
    page.on("dialog", (dialog) => void dialog.accept());
    await page.goto(`/ko/admin/links/${CODE}`);

    await page.getByRole("button", { name: "이 링크 끄기" }).click();
    await expect(page.getByText(/^꺼짐 · 관리자 · /)).toBeVisible();
    await expect(page.getByText("꺼짐", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "다시 켜기" }).click();
    await expect(page.getByRole("button", { name: "이 링크 끄기" })).toBeVisible();
    await expect(page.getByText("활성", { exact: true })).toBeVisible();
    expect(calls).toEqual(["disable", "enable"]);
  });

  test("the owner learns why their link is off and can appeal through the report form", async ({
    page,
  }) => {
    await signIn(page);
    await mockBackend(page, {
      [`GET /api/v1/links/${CODE}/detail`]: (route) =>
        route.fulfill({
          json: {
            ...(mockLinksResponse(`/api/v1/links/${CODE}/detail`, "GET") as Record<string, unknown>),
            moderation: { reason: "SAFE_BROWSING", disabledAt: "2026-09-30T03:00:00Z" },
          },
        }),
    });
    await page.goto(`/ko/stats/${CODE}`);

    const banner = page.getByRole("alert").filter({ hasText: "꺼진 링크예요." });
    await expect(banner).toContainText("Google Safe Browsing");
    await banner.getByRole("link", { name: "이의 제기" }).click();

    await expect(page).toHaveURL(/\/ko\/report\?/);
    await expect(page.getByText(`kurl.me/${CODE}`, { exact: true })).toBeVisible();
    await expect(page.getByLabel("기타")).toBeChecked();
  });
});
