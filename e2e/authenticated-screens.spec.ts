import { expect, test } from "@playwright/test";
import { signInAs, uniqueEmail } from "./helpers/auth";

test.describe("authenticated screens", () => {
  test("dashboard and profile stats hydrate without dev overlay regressions", async ({
    page,
    context,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      const text = message.text();
      if (message.type() === "error" && /hydration|initial UI/i.test(text)) {
        errors.push(text);
      }
    });

    const token = await signInAs(page, context, uniqueEmail("auth-screens"));
    const username = `auth${Date.now().toString(36).slice(-10)}`;
    const profile = await context.request.put("/api/v1/users/me/profile", {
      data: { username },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(profile.ok()).toBe(true);

    await page.goto("/ko/dashboard");
    await expect(page.getByRole("heading", { name: "내 링크" })).toBeVisible();

    await page.goto("/ko/content/readers");
    await expect(page.getByRole("heading", { name: "내 프로필 방문 통계" })).toBeVisible();
    await expect(page.getByText("settings.profile.stats.intro")).toHaveCount(0);
    await expect(page.getByText("/u/username")).toBeVisible();

    expect(errors).toEqual([]);
  });
});
