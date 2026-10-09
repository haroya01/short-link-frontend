import { expect, test } from "@playwright/test";

// Mock lane: haruka wrote a thread in four parts (30 → 31 → 32 → 33); yuna replied to the first.
test.use({ viewport: { width: 1280, height: 900 } });

test("a note written in parts shows two parts in the feed and the rest in its detail", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const first = page.getByTestId("note-position-30");
  await first.scrollIntoViewIfNeeded({ timeout: 30_000 });
  await expect(first).toHaveText("1/4");
  await expect(page.getByTestId("note-position-31")).toHaveText("2/4");
  await expect(page.getByText("둘. 경계를 먼저 긋게 됐다.")).toHaveCount(0);
  const more = page.getByTestId("note-thread-more-30");
  await expect(more).toHaveText("이어지는 글 2개 더");

  await more.click();
  await expect(page.getByTestId("note-position-33")).toHaveText("4/4", { timeout: 30_000 });
  await expect(page.getByText("둘. 경계를 먼저 긋게 됐다.")).toBeVisible();
  const replies = page.getByRole("region", { name: "답글" });
  await expect(replies).toContainText("셋째가 제일 공감돼요.");
  await expect(replies).not.toContainText("하나. 테스트가 빨라졌다.");
});
