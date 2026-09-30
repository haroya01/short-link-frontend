import { expect, test } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";
import { mockAnonymousShorten } from "./helpers/mock-shorten";

test.describe("password while shortening", () => {
  test("anonymous visitors learn that signing in lets them lock links", async ({ page }) => {
    await mockAnonymousShorten(page);
    await page.goto("/ko");

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
    await page.goto("/ko/dashboard");

    const password = page.getByPlaceholder("링크를 여는 사람이 입력할 비밀번호");
    const lockToggle = page.getByRole("button", { name: "비밀번호 걸기" });
    // 접힌 줄이 렌더된 뒤에 숨김을 본다 — 렌더 전의 '아직 없음'을 숨김으로 통과시키지 않도록.
    await expect(lockToggle).toBeVisible();
    await expect(password).toBeHidden();
    await lockToggle.click();
    await expect(password).toBeVisible();
    await expect(password).toBeFocused();
    await password.pressSequentially("open-sesame");
    await expect(password).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "비밀번호 보기" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(password).toHaveValue("open-sesame");
    await expect(password).toBeFocused();
    await page.getByRole("button", { name: "비밀번호 숨기기" }).click();
    await expect(password).toHaveAttribute("type", "password");

    await page.getByPlaceholder(/긴 주소를 여기에/).fill("https://example.com/private-deck");
    await page.getByRole("button", { name: "단축하기" }).click();

    const line = page.getByTestId("result-line").first();
    await expect(line.getByText("비밀번호 걸림")).toBeVisible({ timeout: 10000 });
    expect(sent).toMatchObject({ url: "https://example.com/private-deck", password: "open-sesame" });
    await expect(password).toBeHidden();
  });

  test("the password field in link settings can be revealed too", async ({ page }) => {
    await signIn(page);
    await mockBackend(page);
    await page.goto("/ko/stats/e2ePw#settings");

    const section = page.locator("section", { has: page.getByRole("heading", { name: "보호", exact: true }) });
    const field = section.locator('input[autocomplete="new-password"]');
    await field.fill("s3cret");
    await expect(field).toHaveAttribute("type", "password");
    await section.getByRole("button", { name: "비밀번호 보기" }).click();
    await expect(field).toHaveAttribute("type", "text");
    await expect(field).toHaveValue("s3cret");
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
    await page.goto("/ko/dashboard");

    await page.getByRole("button", { name: "비밀번호 걸기" }).click();
    // 펼치면 다음 프레임에 비밀번호 칸으로 포커스가 온다 — 그걸 본 뒤에 주소를 넣어야 입력이 엇갈리지 않는다.
    await expect(page.getByPlaceholder("링크를 여는 사람이 입력할 비밀번호")).toBeFocused();
    await page.getByPlaceholder(/긴 주소를 여기에/).fill("https://example.com/private-deck");
    await page.getByRole("button", { name: "단축하기" }).click();

    await expect(page.getByText("비밀번호를 입력해 주세요.")).toBeVisible();
    await expect(page.getByPlaceholder("링크를 여는 사람이 입력할 비밀번호")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByPlaceholder(/긴 주소를 여기에/)).toHaveAttribute("aria-invalid", "false");
    await expect(page.getByPlaceholder("링크를 여는 사람이 입력할 비밀번호")).toBeFocused();
    expect(posts).toBe(0);
  });
});
