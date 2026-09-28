import { expect, test } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";
import { mockLinksResponse } from "../lib/api/_links-mocks";

test.describe("dashboard is the signed-in home", () => {
  test("opening the home while signed in lands on the dashboard with the shortener on top", async ({ page }) => {
    await signIn(page);
    await mockBackend(page);
    await page.goto("/ko");
    await expect(page).toHaveURL(/\/ko\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1, name: "내 링크" })).toBeVisible();
    await expect(page.getByPlaceholder(/긴 주소를 여기에/)).toBeVisible();
    await expect(page.getByRole("link", { name: /새 링크/ })).toHaveCount(0);
  });

  test("a link shared in from another app is waiting in the field, not shortened", async ({ page }) => {
    let created = 0;
    await signIn(page);
    await mockBackend(page, {
      "POST /api/v1/links": (route) => {
        created += 1;
        return route.fulfill({ status: 201, json: { shortCode: "share01", shortUrl: "http://localhost:3001/share01", claimToken: null } });
      },
    });
    await page.goto(`/ko?shared_text=${encodeURIComponent("이거 봐 https://example.com/shared 좋더라")}`);
    await expect(page).toHaveURL(/\/ko\/dashboard$/);
    await expect(page.getByPlaceholder(/긴 주소를 여기에/)).toHaveValue("https://example.com/shared");
    await page.waitForTimeout(500);
    expect(created).toBe(0);
  });

  test("the click sort asks for human clicks, and an old total-click address lands there too", async ({ page }) => {
    const asked: string[] = [];
    await signIn(page);
    await mockBackend(page, {
      "GET /api/v1/links/me": (route) => {
        const url = new URL(route.request().url());
        asked.push(`${url.searchParams.get("sort")} ${url.searchParams.get("dir")}`);
        return route.fulfill({ json: mockLinksResponse(url.pathname + url.search, "GET") });
      },
    });
    await page.goto("/ko/dashboard");
    await page.getByRole("button", { name: /사람 클릭순/ }).click();
    await expect.poll(() => asked.at(-1)).toBe("humanClickCount desc");

    await page.goto("/ko/dashboard?sort=clickCount&dir=asc");
    await expect.poll(() => asked.at(-1)).toBe("humanClickCount asc");
    await expect(page).toHaveURL(/\/ko\/dashboard$/);
  });

  test("the phone composer sets code and password before shortening", async ({ page }) => {
    let sent: { url?: string; customCode?: string; password?: string } | undefined;
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await mockBackend(page, {
      "POST /api/v1/links": (route) => {
        sent = JSON.parse(route.request().postData() ?? "{}");
        return route.fulfill({ status: 201, json: { shortCode: "spring26", shortUrl: "http://localhost:3001/spring26", claimToken: null } });
      },
    });
    await page.goto("/ko/dashboard");
    const composer = page.getByRole("textbox", { name: "긴 주소 붙여넣기" });
    await composer.fill("https://example.com/spring");

    await page.getByRole("button", { name: "단축 옵션" }).click();
    const sheet = page.getByRole("dialog", { name: "단축 옵션" });
    await sheet.getByPlaceholder("myLink2026").fill("spring26");
    await sheet.getByRole("switch", { name: "비밀번호 걸기" }).click();
    await sheet.getByPlaceholder("링크를 여는 사람이 입력할 비밀번호").fill("open-sesame");
    await sheet.getByRole("button", { name: "완료" }).click();

    await expect(page.getByRole("button", { name: /단축 옵션, 2개 설정됨/ })).toBeVisible();
    await page.getByRole("button", { name: "단축", exact: true }).click();
    await expect(page.getByRole("dialog").getByText("spring26")).toBeVisible();
    expect(sent).toMatchObject({ url: "https://example.com/spring", customCode: "spring26", password: "open-sesame" });
  });
});
