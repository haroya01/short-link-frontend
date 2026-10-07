import { expect, test } from "@playwright/test";

// Mock lane: the viewer (dohyun) approves followers by hand; sori (this server) and carol@fosstodon.org
// wait. haruka approves her followers by hand too.
test.use({ viewport: { width: 1280, height: 900 } });

test("requests wait atop the notices and are answered there or on their page", async ({ page }) => {
  await page.goto("/ko/blog/notifications");
  const main = page.locator("main");
  const entry = main.getByTestId("follow-requests-entry");
  await expect(entry).toContainText("팔로우 요청", { timeout: 30_000 });
  await expect(entry).toContainText("2");

  const sori = main.getByRole("link", { name: /sori님이 팔로우를 요청했어요/ });
  await expect(sori).toHaveAttribute("href", /\/follow-requests$/);
  const carol = main.getByRole("link", { name: /carol@fosstodon\.org님이 팔로우를 요청했어요/ });
  await expect(carol).toBeVisible();

  const soriRow = main.locator("li").filter({ hasText: "sori님이 팔로우를 요청했어요" });
  await soriRow.getByTestId("follow-request-approve").click();
  await expect(sori).toHaveCount(0);
  await expect(page.getByText("sori님이 팔로워가 됐어요")).toBeVisible();
  await expect(entry).toContainText("1");

  await entry.click();
  await expect(page).toHaveURL(/\/follow-requests$/);
  const row = page.getByTestId("follow-request-carol@fosstodon.org");
  await expect(row).toContainText("Carol");
  await expect(row.getByRole("link")).toHaveAttribute("href", /\/remote\/9810$/);
  await expect(page.getByTestId("follow-request-sori")).toHaveCount(0);
  await row.getByTestId("follow-request-reject").click();
  await expect(page.getByText("기다리는 팔로우 요청이 없어요")).toBeVisible();
});

test("following a locked writer leaves a request that can be withdrawn", async ({ page }) => {
  await page.goto("/ko/p/haruka");
  await expect(page.getByTestId("author-locked")).toBeVisible({ timeout: 30_000 });
  const follow = page.locator("header").getByTestId("follow-button");
  await expect(follow).toHaveText("팔로우");
  await follow.click();
  await expect(follow).toHaveText("요청함");
  await expect(follow).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("팔로우를 요청했어요. 승인되면 팔로잉이 돼요")).toBeVisible();

  await follow.click();
  const dialog = page.getByRole("dialog").filter({ hasText: "팔로우 요청을 취소할까요?" });
  await dialog.getByRole("button", { name: "요청 취소" }).click();
  await expect(follow).toHaveText("팔로우");
});

test("the lock lives in blog settings and unlocking asks first", async ({ page }) => {
  await page.goto("/ko/blog/settings");
  const lock = page.getByRole("switch", { name: "팔로우 직접 승인" });
  await expect(lock).toBeChecked({ timeout: 30_000 });
  await lock.click();
  const dialog = page.getByRole("dialog").filter({ hasText: "팔로우 직접 승인을 끌까요?" });
  await expect(dialog).toContainText("기다리던 팔로우 요청이 모두 승인돼요.");
  await dialog.getByRole("button", { name: "끄기" }).click();
  await expect(lock).not.toBeChecked();
});
