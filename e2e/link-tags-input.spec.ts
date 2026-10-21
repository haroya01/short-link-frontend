import { expect, test, type Page } from "@playwright/test";
import { mockLinksResponse } from "../lib/api/_links-mocks";
import { mockBackend, signIn } from "./helpers/mock-backend";

const CODE = "e2eTags";

async function openLinkTags(page: Page) {
  await signIn(page);
  await mockBackend(page, {
    [`GET /api/v1/links/${CODE}/detail`]: (route) =>
      route.fulfill({
        json: {
          ...(mockLinksResponse(`/api/v1/links/${CODE}/detail`, "GET") as Record<string, unknown>),
          tags: [],
          destinationHealth: {
            broken: true,
            httpStatus: 404,
            brokenSince: "2026-09-26T00:00:00Z",
            checkedAt: "2026-09-27T00:00:00Z",
          },
        },
      }),
  });
  await page.goto(`/ko/stats/${CODE}`);
  await page
    .getByRole("alert")
    .filter({ hasText: "목적지가 열리지 않아요." })
    .getByRole("button", { name: "목적지 바꾸기" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "태그" }).click();
  return { dialog, input: dialog.getByRole("textbox") };
}

test.describe("link tag input", () => {
  test("an Enter that only finishes a Korean composition doesn't add a half-typed tag", async ({ page }) => {
    const { dialog, input } = await openLinkTags(page);
    await input.fill("개발");
    await input.evaluate((el) =>
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true })),
    );
    await expect(dialog.getByRole("button", { name: "태그 개발 빼기" })).toHaveCount(0);
    await expect(input).toHaveValue("개발");

    await input.press("Enter");
    await expect(dialog.getByRole("button", { name: "태그 개발 빼기" })).toBeVisible();
  });

  test("a comma that arrives through the value splits tags", async ({ page }) => {
    const { dialog, input } = await openLinkTags(page);
    await input.fill("디자인,기획,");
    await expect(dialog.getByRole("button", { name: "태그 디자인 빼기" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "태그 기획 빼기" })).toBeVisible();
    await expect(input).toHaveValue("");
  });

  test("a tag is cut to the server's 50-character limit", async ({ page }) => {
    const { dialog, input } = await openLinkTags(page);
    await input.fill("#" + "a".repeat(60));
    await input.press("Enter");
    await expect(dialog.getByRole("button", { name: `태그 ${"a".repeat(50)} 빼기` })).toBeVisible();
  });
});
