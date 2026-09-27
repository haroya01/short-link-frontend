import { expect, test } from "@playwright/test";
import { mockLinksResponse } from "../lib/api/_links-mocks";
import { mockBackend, signIn } from "./helpers/mock-backend";

const CODE = "e2eGone";

test.describe("destination health", () => {
  test("a broken destination is called out with a way to fix it", async ({ page }) => {
    await signIn(page);
    await mockBackend(page, {
      [`GET /api/v1/links/${CODE}/detail`]: (route) =>
        route.fulfill({
          json: {
            ...(mockLinksResponse(`/api/v1/links/${CODE}/detail`, "GET") as Record<string, unknown>),
            destinationHealth: {
              broken: true,
              failure: "NOT_FOUND",
              httpStatus: 404,
              brokenSince: "2026-09-26T00:00:00Z",
              checkedAt: "2026-09-27T00:00:00Z",
            },
          },
        }),
    });
    await page.goto(`/ko/stats/${CODE}`);

    const banner = page.getByRole("alert").filter({ hasText: "목적지가 열리지 않아요." });
    await expect(banner).toContainText("페이지가 사라져서(404)");
    await banner.getByRole("button", { name: "목적지 바꾸기" }).click();
    await expect(page.getByRole("dialog").getByText("링크 편집")).toBeVisible();
  });

  test("a healthy destination shows no banner", async ({ page }) => {
    await signIn(page);
    await mockBackend(page);
    await page.goto(`/ko/stats/${CODE}`);

    await expect(page.getByText("누적 전체 클릭", { exact: true })).toBeVisible();
    await expect(page.getByText("목적지가 열리지 않아요.")).toHaveCount(0);
  });
});
