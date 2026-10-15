import { expect, test } from "@playwright/test";

// Mock lane: the viewer follows yuna and minji; kazuki and haruka are reachable by typing.
test.use({ viewport: { width: 1280, height: 900 } });

test("typing @ in a note offers the people you follow, letters narrow it, Enter fills the handle", async ({
  page,
}) => {
  await page.goto("/ko/blog/notes");
  const composer = page.getByRole("textbox", { name: "노트 쓰기" });
  await expect(composer).toBeVisible({ timeout: 30_000 });
  await composer.click();
  await page.keyboard.type("오늘 @");
  const list = page.getByTestId("mention-suggestions");
  await expect(list.getByRole("option")).toHaveCount(2);
  await expect(list).toContainText("@yuna");

  await page.keyboard.type("카");
  await expect(list.getByRole("option")).toHaveCount(1);
  await expect(list).toContainText("@kazuki");
  await page.keyboard.press("Enter");
  await expect(composer).toHaveValue("오늘 @kazuki ");
  await expect(list).toHaveCount(0);
});

test("a comment offers the same people and a click puts the handle in", async ({ page }) => {
  await page.goto("/en/p/dohyun/nextjs-14-app-router-blog");
  const placeholder = page.getByTestId("comment-composer-placeholder");
  await expect(placeholder).toBeVisible({ timeout: 30_000 });
  await placeholder.click();
  const field = page.getByRole("textbox", { name: "Write a comment" });
  await field.click();
  await page.keyboard.type("thanks @mi");
  const list = page.getByTestId("mention-suggestions");
  await expect(list.getByRole("option")).toHaveCount(1);
  await list.getByRole("button", { name: /@minji/ }).click();
  await expect(field).toHaveValue("thanks @minji ");
  await expect(list).toHaveCount(0);
});
