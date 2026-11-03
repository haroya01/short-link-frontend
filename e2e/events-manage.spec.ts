import { expect, test, type Page } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

const DAY = 86_400_000;
const at = (days: number) => new Date(Date.now() + days * DAY).toISOString();

function event(patch: Record<string, unknown> = {}) {
  return {
    id: 1, slug: "seongsu", title: "성수 모각코 11월", descriptionMd: null, coverImageUrl: null, startsAt: at(7),
    endsAt: at(7.1), timezone: "Asia/Seoul", locationText: "성수 카페 2층", locationUrl: null, onlineUrl: null,
    capacity: 20, closeAt: null, contactField: "KAKAO", status: "OPEN", registrationCount: 7,
    questions: [], createdAt: "2026-11-01T00:00:00Z",
    links: [
      { linkId: 11, shortCode: "mk11", label: "기본" },
      { linkId: 12, shortCode: "mk11k", label: "단톡방" },
    ],
    ...patch,
  };
}

const ATTENDEES = [
  { id: 1, name: "김민지", contact: "minji_k", answers: {}, status: "CONFIRMED", channel: "단톡방", createdAt: "2026-11-02T10:00:00Z", canceledAt: null },
];
const ANALYTICS = {
  totalClicks: 58, totalRegistrations: 7, dailyRegistrations: [],
  clicksByLink: [{ key: "단톡방", count: 31 }], clicksByClientApp: [{ key: "KakaoTalk", count: 29 }],
  registrationsByChannel: [{ key: "단톡방", count: 4 }],
};

async function organizer(page: Page, ev: Record<string, unknown>) {
  const statusCalls: string[] = [];
  await signIn(page);
  await mockBackend(page, {
    "GET /api/v1/events/1": (route) => route.fulfill({ json: ev }),
    "GET /api/v1/events/1/attendees": (route) => route.fulfill({ json: ATTENDEES }),
    "GET /api/v1/events/1/analytics": (route) => route.fulfill({ json: ANALYTICS }),
    "POST /api/v1/events/1/status": (route) => {
      const { action } = JSON.parse(route.request().postData() ?? "{}");
      statusCalls.push(action);
      Object.assign(ev, { status: action === "cancel" ? "CANCELED" : action === "close" ? "CLOSED" : "OPEN" });
      return route.fulfill({ json: ev });
    },
  });
  return statusCalls;
}

const main = (page: Page) => page.getByRole("main");

test("the head says state, time, place and seats in words, without a pill or an icon", async ({ page }) => {
  await organizer(page, event());
  await page.goto("/ko/events/1");
  const head = main(page).locator("header");
  await expect(head.getByRole("heading", { level: 1, name: "성수 모각코 11월" })).toBeVisible();
  await expect(head).toContainText("모집 중");
  await expect(head).toContainText("7/20명");
  await expect(head.locator("svg, .rounded-full")).toHaveCount(0);
  await expect(head.getByRole("link", { name: "공개 페이지 보기" })).toHaveAttribute("href", /\/ko\/e\/seongsu$/);
  await expect(head.getByRole("link", { name: "수정" })).toHaveAttribute("href", /\/events\/1\/edit$/);
});

test("a past event and a full one read as such in the head", async ({ page }) => {
  await organizer(page, event({ startsAt: at(-3), endsAt: null }));
  await page.goto("/ko/events/1");
  await expect(main(page).locator("header")).toContainText("끝남");

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await organizer(page, event({ registrationCount: 20 }));
  await page.goto("/ko/events/1");
  await expect(main(page).locator("header")).toContainText("정원 마감");
});

test("right after publishing, the short link sweeps in with one copy button and no banner sentence", async ({ page }) => {
  await organizer(page, event());
  await page.goto("/ko/events/1?created=1");
  const line = page.getByTestId("event-created-line");
  await expect(line.getByRole("link", { name: /\/mk11$/ })).toBeVisible();
  await expect(line.getByRole("button")).toHaveCount(1);
  await expect(line.getByRole("button")).toHaveText("링크 복사");
  await expect(page.getByText("이 링크를 단톡이나 SNS에 올려 주세요", { exact: false })).toHaveCount(0);
});

test("share rows, attendees and analytics carry no boxes or position hints", async ({ page }) => {
  await organizer(page, event());
  await page.goto("/ko/events/1");
  const copy = main(page).getByRole("button", { name: "복사", exact: true }).first();
  await expect(copy).toBeVisible();
  await expect(copy).toHaveCSS("border-top-width", "0px");
  await expect(main(page).locator("table .rounded-full")).toHaveCount(0);
  await expect(main(page).locator("table")).toContainText("단톡방");
  await expect(main(page).getByRole("heading", { name: "앱별 클릭", exact: true })).toBeVisible();
  await expect(main(page)).not.toContainText("위의 공유 링크");
});

test("canceling is a red word, one confirm, and then the manage row is gone", async ({ page }) => {
  const calls = await organizer(page, event());
  await page.goto("/ko/events/1");
  const cancel = main(page).getByRole("button", { name: "모임 취소", exact: true });
  await expect(cancel).toHaveCSS("border-top-width", "0px");
  await expect(cancel).toHaveCSS("color", "rgb(185, 28, 28)");
  await cancel.click();
  await page.getByRole("dialog").getByRole("button", { name: "모임 취소", exact: true }).click();
  await expect.poll(() => calls).toEqual(["cancel"]);
  await expect(main(page).locator("header")).toContainText("취소됨");
  await expect(main(page).getByRole("button", { name: "모임 취소", exact: true })).toHaveCount(0);
});
