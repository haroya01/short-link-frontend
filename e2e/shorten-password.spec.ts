import { expect, test } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";
import { mockAnonymousShorten } from "./helpers/mock-shorten";

test.describe("password while shortening", () => {
  test("anonymous visitors learn that signing in lets them lock links", async ({ page }) => {
    await mockAnonymousShorten(page);
    await page.goto("/ko?stage=off");

    await expect(page.getByText("로그인하면 통계를 보고 비밀번호도 걸 수 있어요", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "비밀번호 걸기" })).toHaveCount(0);
  });

  test("a signed-in user locks the link in the same step", async ({ page }) => {
    let sent: { url?: string; password?: string } | undefined;
    await signIn(page);
    await mockBackend(page, {
      "POST /api/v1/links": (route) => {
        sent = JSON.parse(route.request().postData() ?? "{}");
        return route.fulfill({
          status: 201,
          json: {
            shortCode: "lock001",
            shortUrl: "http://localhost:3001/lock001",
            claimToken: null,
            passwordProtected: true,
          },
        });
      },
    });
    await page.goto("/ko?stage=off");

    await page.getByRole("button", { name: "비밀번호 걸기" }).click();
    await page.getByPlaceholder("링크를 여는 사람이 입력할 비밀번호").fill("open-sesame");
    await page.getByPlaceholder(/긴 주소를 여기에/).fill("https://example.com/private-deck");
    await page.getByRole("button", { name: "단축하기" }).click();

    const line = page.getByTestId("result-line").first();
    await expect(line.getByText("비밀번호 걸림")).toBeVisible({ timeout: 10000 });
    expect(sent).toMatchObject({ url: "https://example.com/private-deck", password: "open-sesame" });
  });

  test("an empty password is caught before anything is sent", async ({ page }) => {
    let posts = 0;
    await signIn(page);
    await mockBackend(page, {
      "POST /api/v1/links": (route) => {
        posts += 1;
        return route.fulfill({ status: 500, json: {} });
      },
    });
    await page.goto("/ko?stage=off");

    await page.getByRole("button", { name: "비밀번호 걸기" }).click();
    await page.getByPlaceholder(/긴 주소를 여기에/).fill("https://example.com/private-deck");
    await page.getByRole("button", { name: "단축하기" }).click();

    await expect(page.getByText("비밀번호를 입력해 주세요.")).toBeVisible();
    expect(posts).toBe(0);
  });
});
