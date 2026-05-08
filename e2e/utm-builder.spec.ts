import { expect, test } from "@playwright/test";

test.describe("UTM builder", () => {
  test("appends utm parameters to shortened URL destination", async ({ page, request }) => {
    await page.goto("/");
    await page.getByPlaceholder(/your-very-long-url/).fill("https://example.com/utm-test");

    await page.getByRole("button", { name: /UTM 파라미터 추가/ }).click();
    await page.getByLabel("Source").fill("newsletter");
    await page.getByLabel("Medium").fill("email");
    await page.getByLabel("Campaign").fill("e2e-test");

    await expect(page.locator("code")).toContainText("utm_source=newsletter");

    await page.getByRole("button", { name: "단축하기" }).click();
    const resultLink = page.locator("a", { hasText: /\/[0-9A-Za-z]{7}/ }).first();
    await expect(resultLink).toBeVisible({ timeout: 10000 });

    const href = await resultLink.getAttribute("href");
    const code = href!.split("/").pop()!;

    const fetched = await request.get(`/${code}`, { maxRedirects: 0 });
    const location = fetched.headers()["location"];
    expect(location).toContain("utm_source=newsletter");
    expect(location).toContain("utm_medium=email");
    expect(location).toContain("utm_campaign=e2e-test");
  });

  test("empty fields are not appended", async ({ page, request }) => {
    await page.goto("/");
    await page.getByPlaceholder(/your-very-long-url/).fill("https://example.com/utm-empty");
    await page.getByRole("button", { name: /UTM 파라미터 추가/ }).click();
    // open but leave fields empty
    await page.getByRole("button", { name: "단축하기" }).click();
    const resultLink = page.locator("a", { hasText: /\/[0-9A-Za-z]{7}/ }).first();
    await expect(resultLink).toBeVisible({ timeout: 10000 });
    const href = await resultLink.getAttribute("href");
    const code = href!.split("/").pop()!;
    const fetched = await request.get(`/${code}`, { maxRedirects: 0 });
    expect(fetched.headers()["location"]).not.toContain("utm_");
  });
});
