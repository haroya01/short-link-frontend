import { expect, test, type Page } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

async function organizer(page: Page) {
  const posts: Record<string, unknown>[] = [];
  await signIn(page);
  await mockBackend(page, {
    "GET /api/v1/events": (route) => route.fulfill({ json: [] }),
    "POST /api/v1/events": (route) => {
      posts.push(JSON.parse(route.request().postData() ?? "{}"));
      return route.fulfill({ status: 400, json: { status: 400, detail: "should not be sent" } });
    },
  });
  return posts;
}

const preview = (page: Page) => page.getByTestId("event-preview");

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("an end before the start is reported right under the end field, on leaving it and on publish", async ({ page }) => {
    const posts = await organizer(page);
    await page.goto("/ko/events/new");
    await expect(page.locator("#ef-starts")).not.toHaveValue("");
    await page.locator("#ef-title").fill("성수 모각코");
    await page.locator("#ef-starts").fill("2030-04-01T19:00");
    await page.locator("#ef-ends").fill("2030-04-01T18:00");
    await page.locator("#ef-ends").blur();

    const error = page.locator("#ef-ends-error");
    await expect(error).toHaveText("종료가 시작보다 앞서요");
    await expect(page.locator("#ef-ends")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#ef-ends")).toHaveAttribute("aria-describedby", "ef-ends-error");
    const field = await page.locator("#ef-ends").boundingBox();
    const line = await error.boundingBox();
    expect(line!.y).toBeGreaterThan(field!.y + field!.height - 1);
    expect(line!.y - (field!.y + field!.height)).toBeLessThan(16);

    await page.getByRole("button", { name: "발행하기" }).click();
    await expect(page.locator("#ef-ends")).toBeFocused();
    expect(posts).toHaveLength(0);

    await page.locator("#ef-ends").fill("2030-04-01T21:00");
    await expect(error).toHaveCount(0);
  });

  test("publishing an empty title marks the title field and sends nothing", async ({ page }) => {
    const posts = await organizer(page);
    await page.goto("/ko/events/new");
    await expect(page.locator("#ef-starts")).not.toHaveValue("");
    await expect(page.getByText("* 필수", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "발행하기" }).click();
    await expect(page.locator("#ef-title-error")).toHaveText("제목을 적어 주세요");
    await expect(page.locator("#ef-title")).toBeFocused();
    expect(posts).toHaveLength(0);
  });

  test("a time the server rejects lands under its own field too", async ({ page }) => {
    await signIn(page);
    await mockBackend(page, {
      "POST /api/v1/events": (route) =>
        route.fulfill({
          status: 400,
          json: { status: 400, code: "INVALID_EVENT_DETAILS", field: "closeAt", detail: "invalid event details" },
        }),
    });
    await page.goto("/ko/events/new");
    await expect(page.locator("#ef-starts")).not.toHaveValue("");
    await page.locator("#ef-title").fill("성수 모각코");
    await page.locator("#ef-starts").fill("2030-04-01T19:00");
    await page.locator("#ef-close").fill("2030-04-01T18:00");
    await page.getByRole("button", { name: "발행하기" }).click();

    await expect(page.locator("#ef-close-error")).toHaveText("신청 마감이 모임 시작보다 늦어요");
    await expect(page.locator("#ef-close")).toBeFocused();
    await expect(page.locator("#ef-panel-edit [role=alert]")).toHaveCount(0);
  });

  test("the preview beside the form follows what is typed", async ({ page }) => {
    await organizer(page);
    await page.goto("/ko/events/new");
    await expect(page.locator("#ef-starts")).not.toHaveValue("");
    await expect(preview(page)).toBeVisible();
    await expect(page.getByRole("tab", { name: "미리보기" })).toBeHidden();

    await page.locator("#ef-title").fill("성수 모각코 11월");
    await expect(preview(page).getByRole("heading", { level: 2, name: "성수 모각코 11월" })).toBeVisible();

    await page.locator("#ef-starts").fill("2030-04-01T19:00");
    await page.locator("#ef-ends").fill("2030-04-01T21:00");
    await expect(preview(page)).toContainText("2030년 4월 1일 (월)");

    await page.locator("#ef-cap").fill("12");
    await expect(preview(page)).toContainText("남은 자리 12 / 12");

    await page.locator("#ef-desc").fill("각자 할 거 들고 와요");
    await expect(preview(page).locator(".prose-event")).toHaveText("각자 할 거 들고 와요");

    await page.locator("#ef-starts").fill("2020-04-01T19:00");
    await page.locator("#ef-ends").fill("2020-04-01T21:00");
    await expect(preview(page)).toContainText("끝난 모임이에요.");
    await expect(preview(page).getByRole("button", { name: "신청하기" })).toHaveCount(0);
  });

  test("a preview taller than the screen is not boxed into its own scroll, so the page scroll reaches its whole register button", async ({ page }) => {
    await organizer(page);
    await page.goto("/ko/events/new");
    await expect(page.locator("#ef-starts")).not.toHaveValue("");
    await page.locator("#ef-title").fill("성수 모각코 11월");
    await page.locator("#ef-desc").fill(Array.from({ length: 30 }, (_, i) => `${i + 1}번째 메모`).join("\n\n"));

    const box = preview(page);
    await expect(box.locator(".prose-event")).toContainText("30번째 메모");
    expect(await box.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
    const button = box.getByRole("button", { name: "신청하기" });
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeInViewport({ ratio: 1 });
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a tab switches between the form and the same preview", async ({ page }) => {
    await organizer(page);
    await page.goto("/ko/events/new");
    await expect(page.locator("#ef-starts")).not.toHaveValue("");
    await page.locator("#ef-title").fill("퇴근 후 러닝");
    await expect(preview(page)).toBeHidden();

    await page.locator("#ef-cap").scrollIntoViewIfNeeded();
    await page.getByRole("tab", { name: "미리보기" }).click();
    await expect(page.getByRole("tab", { name: "미리보기" })).toHaveAttribute("aria-selected", "true");
    await expect(preview(page)).toBeVisible();
    await expect(preview(page).getByRole("heading", { level: 2, name: "퇴근 후 러닝" })).toBeInViewport();
    await expect(page.locator("#ef-title")).toBeHidden();

    await page.getByRole("tab", { name: "작성" }).click();
    await expect(page.locator("#ef-title")).toHaveValue("퇴근 후 러닝");
    await expect(preview(page)).toBeHidden();
  });
});

test.describe("signed out", () => {
  for (const path of ["/ko/events", "/ko/events/new"]) {
    test(`${path} hydrates without a text mismatch, so the pre-paint flags on <html> survive`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(path);
      await expect(page.getByRole("link", { name: "로그인하고 시작하기" })).toBeVisible();
      await page.waitForTimeout(500);
      await expect(page.locator("html")).toHaveAttribute("data-js", "");
      expect(errors.filter((message) => /#4(18|23|25)\b|hydrat/i.test(message))).toEqual([]);
    });
  }

  test("the events intro shows the real participant page and the real analytics panel", async ({ page }) => {
    await page.goto("/ko/events");
    await expect(page.getByRole("heading", { level: 1, name: "모임 신청을 링크로 받아요" })).toBeVisible();
    await expect(page.getByRole("link", { name: "로그인하고 시작하기" })).toHaveCount(1);
    await expect(page.getByText("우리 동네 독서 모임", { exact: true })).toBeVisible();
    await expect(page.getByText("참여 7명 · 남은 자리 13 / 20", { exact: true })).toBeVisible();
    await expect(page.getByText("유입 분석", { exact: true })).toBeVisible();
  });

  test("/events/new shows the intro instead of a lone sign-in line, and the button comes back here", async ({ page }) => {
    await page.goto("/ko/events/new?ref=event-success");
    await expect(page.getByRole("heading", { level: 1, name: "모임 신청을 링크로 받아요" })).toBeVisible();
    await expect(page.getByTestId("sign-in-empty")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "로그인하고 시작하기" })).toHaveAttribute("href", /\/login\?next=\/events\/new$/);
  });
});
