import { expect, test } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

const CODE = "e2eVisit";

test.describe("visit options", () => {
  test("the owner sends KakaoTalk and LINE visitors to their browser", async ({ page }) => {
    let sent: { openInBrowser?: boolean } | undefined;
    await signIn(page);
    await mockBackend(page, {
      [`PATCH /api/v1/links/${CODE}/visit-options`]: (route) => {
        sent = JSON.parse(route.request().postData() ?? "{}");
        return route.fulfill({ json: { shortCode: CODE, openInBrowser: Boolean(sent?.openInBrowser) } });
      },
    });
    await page.goto(`/ko/stats/${CODE}#settings`);

    const toggle = page.getByRole("switch", { name: "카카오톡·LINE에선 기본 브라우저로 열기" });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await toggle.click();

    await expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(sent).toEqual({ openInBrowser: true });
  });

  test("a failed save puts the switch back", async ({ page }) => {
    await signIn(page);
    await mockBackend(page, {
      [`PATCH /api/v1/links/${CODE}/visit-options`]: (route) => route.fulfill({ status: 500, json: {} }),
    });
    await page.goto(`/ko/stats/${CODE}#settings`);

    const toggle = page.getByRole("switch", { name: "카카오톡·LINE에선 기본 브라우저로 열기" });
    await toggle.click();

    await expect(toggle).toHaveAttribute("aria-checked", "false");
  });
});
