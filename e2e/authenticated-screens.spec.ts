import { expect, test } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

test.describe("authenticated screens", () => {
  test("dashboard and profile editor hydrate without dev overlay regressions", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      const text = message.text();
      if (message.type() === "error" && /hydration|initial UI/i.test(text)) {
        errors.push(text);
      }
    });

    await signIn(page);
    await mockBackend(page);

    await page.goto("/ko/dashboard");
    await expect(page.getByRole("heading", { name: "내 링크" })).toBeVisible();

    await page.goto("/ko/settings/profile");
    await expect(page.getByRole("heading", { name: "공개 프로필" })).toBeVisible();
    await expect(page.getByText("settings.profile.intro")).toHaveCount(0);

    expect(errors).toEqual([]);
  });
});
