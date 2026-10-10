import { expect, test, type Page } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";
import { expectOnTop, toastBy } from "./helpers/on-top";

type Draft = Record<string, unknown> & { title: string; startsAt: string; capacity?: number | null };

async function organizerBackend(page: Page) {
  const events: Record<string, unknown>[] = [];
  const find = (url: string) => events.find((e) => e.id === Number(url.match(/\/events\/(\d+)/)?.[1]));
  await signIn(page);
  await mockBackend(page, {
    "GET /api/v1/events": (route) => route.fulfill({ json: events }),
    "POST /api/v1/events": (route) => {
      const draft = JSON.parse(route.request().postData() ?? "{}") as Draft;
      const event = {
        id: events.length + 1, slug: `e2e-${events.length + 1}`, descriptionMd: null, coverImageUrl: null, endsAt: null,
        timezone: "Asia/Seoul", locationText: null, locationUrl: null, onlineUrl: null, closeAt: null, contactField: "EMAIL",
        questions: [], ...draft, capacity: draft.capacity ?? null, status: "OPEN", registrationCount: 0, links: [],
        createdAt: "2026-09-23T00:00:00Z",
      };
      events.push(event);
      return route.fulfill({ json: event });
    },
  });
  await page.route(/\/api\/v1\/events\/\d+(\/.*)?$/, (route) => {
    const url = route.request().url();
    const event = find(url);
    if (!event) return route.fulfill({ status: 404, json: {} });
    if (url.endsWith("/status") && route.request().method() === "POST") {
      const { action } = JSON.parse(route.request().postData() ?? "{}");
      event.status = action === "close" || action === "CLOSE" ? "CLOSED" : "OPEN";
      return route.fulfill({ json: event });
    }
    if (url.endsWith("/attendees")) return route.fulfill({ json: [] });
    if (url.endsWith("/analytics"))
      return route.fulfill({
        json: { totalClicks: 0, totalRegistrations: 0, clicksByLink: [], clicksByClientApp: [], registrationsByChannel: [], dailyRegistrations: [] },
      });
    return route.fulfill({ json: event });
  });
  return events;
}

test.describe("event organizer flow", () => {
  test("organizer creates and publishes an event with a capacity", async ({ page }) => {
    const events = await organizerBackend(page);
    await page.goto("/ko/events/new");
    await page.getByLabel("제목", { exact: false }).fill("E2E 테스트 스터디");
    await page.locator("#ef-starts").fill("2030-01-15T19:00");
    await page.getByText("정원과 마감").click();
    await page.locator("#ef-cap").fill("5");
    await page.getByRole("button", { name: "발행하기" }).click();

    await expect(page.getByRole("heading", { name: "E2E 테스트 스터디" })).toBeVisible();
    await expect(page.getByText("모집 중", { exact: true })).toBeVisible();
    await expect(page.getByText("0/5", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "공개 페이지 보기" })).toHaveAttribute("href", /\/e\/e2e-1$/);
    expect(events[0]).toMatchObject({ title: "E2E 테스트 스터디", capacity: 5 });
  });

  test("closing registration flips the event status", async ({ page }) => {
    const events = await organizerBackend(page);
    await page.goto("/ko/events/new");
    await page.getByLabel("제목", { exact: false }).fill("마감 테스트");
    await page.locator("#ef-starts").fill("2030-02-01T10:00");
    await page.getByRole("button", { name: "발행하기" }).click();
    await expect(page.getByRole("heading", { name: "마감 테스트" })).toBeVisible();

    await page.getByRole("button", { name: "신청 마감하기" }).click();
    await expectOnTop(toastBy(page, "변경했어요"));
    expect(events[0].status).toBe("CLOSED");
  });

  test("신청이 들어온 모집도 고칠 수 있다 — 잠긴 질문은 보내지 않는다", async ({ page }) => {
    const events = await organizerBackend(page);
    await page.goto("/ko/events/new");
    await page.getByLabel("제목", { exact: false }).fill("신청 받은 모집");
    await page.locator("#ef-starts").fill("2030-03-01T10:00");
    await page.getByRole("button", { name: "발행하기" }).click();
    await expect(page.getByRole("heading", { name: "신청 받은 모집" })).toBeVisible();
    events[0].registrationCount = 1;

    // 서버 규칙 그대로: 확정 신청이 있는데 questions 를 보내면(빈 배열이어도) 거절한다.
    let patchBody: Record<string, unknown> | null = null;
    await page.route(/\/api\/v1\/events\/1$/, (route) => {
      if (route.request().method() !== "PATCH") return route.fallback();
      patchBody = JSON.parse(route.request().postData() ?? "{}");
      if (patchBody && "questions" in patchBody) {
        return route.fulfill({ status: 400, json: { status: 400, detail: "registrations exist", code: "INVALID_QUESTIONS" } });
      }
      Object.assign(events[0], patchBody);
      return route.fulfill({ json: events[0] });
    });

    await page.goto("/ko/events/1/edit");
    await page.getByLabel("제목", { exact: false }).fill("제목만 고친 모집");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByRole("heading", { name: "제목만 고친 모집" })).toBeVisible();
    expect(patchBody).not.toBeNull();
    expect(patchBody).not.toHaveProperty("questions");
  });
});
