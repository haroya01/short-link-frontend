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
    await expect(page.getByText("전체 클릭")).toBeVisible();
    await expect(page.getByText("성과 최고 링크")).toBeVisible();
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

  // 긴 원본 URL 이 표를 컨테이너 밖으로 밀어 액션 열이 잘리던 회귀 — sm~md 폭에서 표가
  // 자체 가로 스크롤 없이 들어맞아야 한다.
  test("긴 URL 에서도 표가 가로 스크롤 없이 들어맞는다", async ({ page, context }) => {
    const email = uniqueEmail("dash-fit");
    const token = await signInAs(page, context, email);
    await createLink(
      context.request,
      "https://docs.example-service.io/guides/getting-started/installation-and-configuration?utm_source=newsletter&utm_campaign=aug",
      token,
    );

    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto("/ko/dashboard");
    // 표시 텍스트는 truncateMiddle 로 잘리므로 원문 전체를 담는 title 로 찾는다.
    await expect(page.locator('table a[title^="https://docs.example-service.io"]')).toBeVisible();
    const overflow = await page.evaluate(() => {
      const scroller = document.querySelector("table")!.parentElement!;
      return scroller.scrollWidth - scroller.clientWidth;
    });
    expect(overflow).toBe(0);
  });

  test("delete removes link from list", async ({ page, context }) => {
    const email = uniqueEmail("dash-del");
    const token = await signInAs(page, context, email);
    const created = await createLink(context.request, "https://example.com/del-target", token);

    await page.goto("/ko/dashboard");
    const row = page.locator("tr", { hasText: created.shortCode });
    await row.getByLabel(/삭제/).click();
    // 다이얼로그 포털이 마운트되기 전에 .last() 가 행의 휴지통 버튼에 바인딩되면 오버레이에
    // 막혀 영영 클릭하지 못한다 — dialog 스코프로 확인 버튼을 기다렸다 잡는다.
    await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
    await expect(row).not.toBeVisible({ timeout: 5000 });
  });
});
