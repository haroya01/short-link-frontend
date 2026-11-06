import { expect, test, type Page } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

const DAY = 86_400_000;
const at = (days: number) => new Date(Date.now() + days * DAY).toISOString();

function event(id: number, title: string, patch: Record<string, unknown>) {
  return {
    id, slug: `e${id}`, title, descriptionMd: null, coverImageUrl: null, startsAt: at(7), endsAt: null,
    timezone: "Asia/Seoul", locationText: "성수 카페 2층", locationUrl: null, onlineUrl: null, capacity: null,
    closeAt: null, contactField: "KAKAO", status: "OPEN", registrationCount: 0, questions: [], links: [],
    createdAt: "2026-10-01T00:00:00Z", ...patch,
  };
}

async function organizer(page: Page, events: unknown[]) {
  await signIn(page);
  await mockBackend(page, { "GET /api/v1/events": (route) => route.fulfill({ json: events }) });
}

const row = (page: Page, title: string) => page.getByRole("listitem").filter({ hasText: title });

test("rows say the state in words only when it is not open, and the count as text", async ({ page }) => {
  await organizer(page, [
    event(1, "성수 모각코 11월", { capacity: 20, registrationCount: 7 }),
    event(2, "퇴근 후 한강 러닝", { registrationCount: 12 }),
    event(3, "책 읽는 밤", { capacity: 15, registrationCount: 15 }),
    event(4, "할로윈 보드게임", { startsAt: at(-3), registrationCount: 9 }),
    event(5, "서촌 사진 산책", { status: "CLOSED", registrationCount: 6 }),
    event(6, "제주 워크숍", { status: "CANCELED", registrationCount: 3 }),
  ]);
  await page.goto("/ko/events");

  await expect(row(page, "성수 모각코 11월")).toContainText("7/20명");
  await expect(row(page, "퇴근 후 한강 러닝")).toContainText("12명");
  await expect(row(page, "성수 모각코 11월")).not.toContainText("모집 중");
  await expect(row(page, "책 읽는 밤")).toContainText("정원 마감");
  await expect(row(page, "할로윈 보드게임")).toContainText("끝남");
  await expect(row(page, "서촌 사진 산책")).toContainText("마감");
  await expect(row(page, "제주 워크숍")).toContainText("취소됨");
  await expect(page.getByRole("main").getByRole("list").locator("svg")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("list").locator(".rounded-full")).toHaveCount(0);
});

test("no events is one line and one new-event button", async ({ page }) => {
  await organizer(page, []);
  await page.goto("/ko/events");
  await expect(page.getByText("아직 만든 모집이 없어요", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "새 모집" })).toHaveCount(1);
  await expect(page.getByRole("main").locator("svg")).toHaveCount(0);
});

test("the events intro has its own canonical and description, and the organizer pages stay out of search", async ({ page }) => {
  await page.goto("/ko/events");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/ko\/events$/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /^모임 소개와 신청 폼을 링크 하나로/);
  await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);

  for (const path of ["/ko/events/new", "/ko/events/1"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});
