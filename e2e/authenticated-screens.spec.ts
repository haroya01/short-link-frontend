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

    // Profile editor hosts the visit-stats summary now that the standalone readers page was folded
    // into post-detail analytics (#602). Assert the editor heading renders and no raw i18n keys leak.
    await page.goto("/ko/settings/profile");
    await expect(page.getByRole("heading", { name: "공개 프로필" })).toBeVisible();
    await expect(page.getByText("settings.profile.intro")).toHaveCount(0);

    expect(errors).toEqual([]);
  });
});
