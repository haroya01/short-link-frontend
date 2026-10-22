import { expect, test } from "@playwright/test";

test("a closing link the card already shows leaves the text, in the feed and on the note page", async ({ page }) => {
  await page.goto("/ko/blog");
  const seed = page.locator('article[data-note-id="3"]');
  await expect(seed.locator("a[data-note-link-card]")).toHaveAttribute("href", "https://kurl.me/about", {
    timeout: 30_000,
  });
  const body = seed.locator("[data-note-body] p");
  await expect(body).toHaveText("오늘 쓴 글의 씨앗: 단축 링크가 사라지면 글도 같이 끊긴다");
  await expect(body.getByRole("link")).toHaveCount(0);

  await page.goto("/ko/p/yuna/notes/3");
  const detail = page.locator('article[data-note-id="3"]').first();
  await expect(detail.locator("a[data-note-link-card]")).toBeVisible({ timeout: 30_000 });
  await expect(detail.locator("[data-note-body] p").first()).toHaveText("오늘 쓴 글의 씨앗: 단축 링크가 사라지면 글도 같이 끊긴다");
});

test("a link in the middle stays, a note that is only the link shows just the card, and editing keeps the link", async ({
  page,
}) => {
  await page.goto("/ko/blog");
  await expect(page.getByRole("textbox", { name: "노트 쓰기" })).toBeVisible({ timeout: 30_000 });

  await page.getByRole("textbox", { name: "노트 쓰기" }).fill("읽어 볼 https://example.com/essay 글이에요");
  await expect(page.locator("div[data-note-link-card]")).toContainText("example.com");
  await page.getByRole("button", { name: "올리기" }).click();
  await page.getByRole("dialog").filter({ hasText: "노트는 다른 서버에도 전해져요" })
    .getByRole("button", { name: "알겠어요, 올릴게요" }).click();
  const middle = page.locator("article").first();
  await expect(middle).toContainText("글이에요");
  await expect(middle.locator("a[data-note-link-card]")).toHaveAttribute("href", "https://example.com/essay");
  await expect(middle.locator("[data-note-body] p").getByRole("link", { name: "https://example.com/essay" })).toBeVisible();

  await page.getByRole("textbox", { name: "노트 쓰기" }).fill("https://example.com/only");
  await expect(page.locator("div[data-note-link-card]")).toContainText("example.com");
  await page.getByRole("button", { name: "올리기" }).click();
  const only = page.locator("article").first();
  await expect(only.locator("a[data-note-link-card]")).toHaveAttribute("href", "https://example.com/only");
  await expect(only.locator("[data-note-body] p")).toHaveCount(0);

  await only.getByRole("button", { name: "메뉴" }).click();
  await page.getByRole("menuitem", { name: "고치기" }).click();
  await expect(only.getByRole("textbox", { name: "고치기" })).toHaveValue("https://example.com/only");
});

test("a note from another server drops its closing link under the card too", async ({ page }) => {
  await page.goto("/ko/blog/explore");
  const remote = page.locator("article").filter({ hasText: "長く使える道具の選び方について書きました。" }).first();
  await expect(remote.locator("a[data-note-link-card]")).toHaveAttribute("href", "https://sora.example/tools", {
    timeout: 30_000,
  });
  await expect(remote.locator("[data-note-body] p")).toHaveText("長く使える道具の選び方について書きました。");
});

test("a note that is only a link opens from the row around its card, while the card opens the link in a new tab", async ({
  page,
  context,
}) => {
  await context.route("https://example.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<title>essay</title>" }),
  );
  await page.goto("/ko/blog");
  await page.getByRole("textbox", { name: "노트 쓰기" }).fill("https://example.com/only");
  await expect(page.locator("div[data-note-link-card]")).toContainText("example.com", { timeout: 30_000 });
  await page.getByRole("button", { name: "올리기" }).click();
  await page.getByRole("dialog").filter({ hasText: "노트는 다른 서버에도 전해져요" })
    .getByRole("button", { name: "알겠어요, 올릴게요" }).click();
  const only = page.locator("article").first();
  const card = only.locator("a[data-note-link-card]");
  await expect(card).toHaveAttribute("href", "https://example.com/only");

  const opened = context.waitForEvent("page");
  await card.click();
  await expect(await opened).toHaveURL("https://example.com/only");
  await expect(page).toHaveURL(/\/blog$/);

  const id = await only.getAttribute("data-note-id");
  const box = (await card.boundingBox())!;
  await page.mouse.click(box.x + 24, box.y - 4);
  await expect(page).toHaveURL(new RegExp(`/notes/${id}$`));
});
