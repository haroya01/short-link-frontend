import { expect, test } from "@playwright/test";
import { ME, mockBackend, signIn } from "./helpers/mock-backend";

test.describe("settings", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/ko/settings");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("shows profile email and joined date", async ({ page }) => {
    await signIn(page);
    await mockBackend(page);
    await page.goto("/ko/settings");
    await expect(page.getByText(ME.email)).toBeVisible();
    await expect(page.getByText("가입일", { exact: true })).toBeVisible();
  });

  test("timezone change saves and persists", async ({ page }) => {
    const me = { ...ME };
    const saved: string[] = [];
    await signIn(page);
    await mockBackend(
      page,
      {
        "PUT /api/v1/users/me/preferences": (route) => {
          const { timezone } = JSON.parse(route.request().postData() ?? "{}");
          saved.push(timezone);
          me.timezone = timezone;
          return route.fulfill({ json: me });
        },
      },
      me,
    );
    await page.goto("/ko/settings");
    const select = page.locator("select").first();
    await select.selectOption("Asia/Tokyo");
    await page.getByRole("button", { name: "저장" }).first().click();
    await expect(page.getByText("저장됨")).toBeVisible({ timeout: 5000 });
    expect(saved).toEqual(["Asia/Tokyo"]);

    await page.reload();
    await expect(select).toHaveValue("Asia/Tokyo");
  });

  test("delete confirmation requires DELETE typing", async ({ page }) => {
    await signIn(page);
    await mockBackend(page);
    await page.goto("/ko/settings");
    await page.getByRole("tab", { name: "데이터" }).click();
    await page.getByRole("button", { name: /계정 영구 삭제/ }).click();
    const confirm = page.getByRole("button", { name: /^영구 삭제/ });
    await expect(confirm).toBeDisabled();
    await page.getByPlaceholder("DELETE").fill("DELETE");
    await expect(confirm).toBeEnabled();
  });
});
