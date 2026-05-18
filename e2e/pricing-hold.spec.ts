import { expect, test } from "@playwright/test";

/**
 * Pricing page contract while Pro 결제 is on hold. The page must:
 *
 *  - still render the Free plan info (200 links / 8 analytics / 5 webhooks / 2FA)
 *  - render the Pro section as informational only (no checkout button)
 *  - surface a "추후 출시" notice so visitors landing from the domain card understand why
 *    they can't subscribe yet
 *
 * Once billing ships we'll wire {@code <PricingCta>} back into the Pro section and either
 * relax these assertions or replace this spec.
 */
test.describe("pricing — Pro hold state", () => {
  test("ko: shows Pro 추후 출시 notice and disabled CTA", async ({ page }) => {
    await page.goto("/ko/pricing");

    await expect(page.getByRole("heading", { name: "요금제" })).toBeVisible();
    await expect(page.getByText("Free 로 단축", { exact: false })).toBeVisible();

    // Hold notice (rendered twice in different roles — assert at least one is visible).
    await expect(page.getByText("추후 출시").first()).toBeVisible();
    await expect(page.getByText("Pro 플랜은 결제 시스템 준비 중", { exact: false })).toBeVisible();

    // Disabled Pro CTA — never offers checkout. The button is aria-disabled and rendered with
    // the "준비 중" label instead of "Pro 시작하기".
    const disabledCta = page.getByRole("button", { name: /준비 중/ });
    await expect(disabledCta).toBeVisible();
    await expect(disabledCta).toBeDisabled();

    // No Pro upgrade / billing portal entry points should leak through.
    await expect(page.getByRole("button", { name: "Pro 시작하기" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "결제 관리" })).toHaveCount(0);
  });

  test("en: shows Pro coming-soon notice and disabled CTA", async ({ page }) => {
    await page.goto("/en/pricing");

    await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible();
    await expect(page.getByText("Coming soon").first()).toBeVisible();

    const disabledCta = page.getByRole("button", { name: /Not available yet/ });
    await expect(disabledCta).toBeVisible();
    await expect(disabledCta).toBeDisabled();
  });
});
