import { expect, test } from "@playwright/test";
import { signInAs, uniqueEmail } from "./helpers/auth";
import { createLink } from "./helpers/links";

test.describe("dashboard (auth)", () => {
  test("lists user's own links", async ({ page, context }) => {
    const email = uniqueEmail("dash-list");
    const token = await signInAs(page, context, email);
    await createLink(context.request, "https://example.com/dash-1", token);
    await createLink(context.request, "https://example.com/dash-2", token);

    await page.goto("/ko/dashboard");
    await expect(page.getByRole("heading", { name: /내 링크/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /example\.com\/dash-1/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /example\.com\/dash-2/ })).toBeVisible();
  });

  test("search filters by original URL", async ({ page, context }) => {
    const email = uniqueEmail("dash-search");
    const token = await signInAs(page, context, email);
    await createLink(context.request, "https://findme.example.com/A", token);
    await createLink(context.request, "https://other.example.com/B", token);

    await page.goto("/ko/dashboard");
    await page.getByPlaceholder(/원본 URL 또는 짧은 코드/).fill("findme");
    await expect(page.getByRole("link", { name: /findme\.example\.com\/A/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /other\.example\.com\/B/ })).toHaveCount(0);
  });

  test("delete removes link from list", async ({ page, context }) => {
    const email = uniqueEmail("dash-del");
    const token = await signInAs(page, context, email);
    const created = await createLink(context.request, "https://example.com/del-target", token);

    await page.goto("/ko/dashboard");
    const row = page.locator("tr", { hasText: created.shortCode });
    await row.getByLabel(/삭제/).click();
    await page.getByRole("button", { name: "삭제" }).last().click();
    await expect(row).not.toBeVisible({ timeout: 5000 });
  });
});
