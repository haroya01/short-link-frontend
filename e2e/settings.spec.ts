import { expect, test } from "@playwright/test";
import { signInAs, uniqueEmail } from "./helpers/auth";

test.describe("settings", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("shows profile email and provider", async ({ page, context }) => {
    const email = uniqueEmail("settings-profile");
    await signInAs(page, context, email);
    await page.goto("/settings");
    await expect(page.getByText(email)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("dev")).toBeVisible();
  });

  test("timezone change saves and persists", async ({ page, context }) => {
    const email = uniqueEmail("settings-tz");
    await signInAs(page, context, email);
    await page.goto("/settings");
    const select = page.locator("select").first();
    await select.selectOption("Asia/Tokyo");
    await page.getByRole("button", { name: "저장" }).first().click();
    await expect(page.getByText("저장됨")).toBeVisible({ timeout: 5000 });

    await page.reload();
    await expect(select).toHaveValue("Asia/Tokyo");
  });

  test("delete confirmation requires DELETE typing", async ({ page, context }) => {
    const email = uniqueEmail("settings-del");
    await signInAs(page, context, email);
    await page.goto("/settings");
    await page.getByRole("button", { name: /계정 영구 삭제/ }).click();
    const confirm = page.getByRole("button", { name: /^영구 삭제/ });
    await expect(confirm).toBeDisabled();
    await page.getByPlaceholder("DELETE").fill("DELETE");
    await expect(confirm).toBeEnabled();
  });
});
