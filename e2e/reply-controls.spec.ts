import { test, expect, type Page } from "@playwright/test";

/**
 * Note reply controls in MOCK-ON. The mock session is @dohyun.
 * Note 70 is yuna's, open only to people it mentions (@haruka); haruka answered as 71.
 * Note 72 is dohyun's: yuna (73) and haruka (75) replied, and mina's reply from another server (74) is
 * already hidden. Mock writes live for the SPA session.
 */
test.use({ viewport: { width: 1280, height: 900 } });

const note = (page: Page, id: number) => page.locator(`article[data-note-id="${id}"]`);

async function menu(page: Page, id: number, item: string) {
  await note(page, id).getByRole("button", { name: "노트 메뉴" }).first().click({ timeout: 30_000 });
  await page.getByRole("menuitem", { name: item, exact: true }).click();
}

test("a thread open only to mentioned people says so instead of offering a reply box", async ({ page }) => {
  await page.goto("/ko/p/yuna/notes/70");
  await expect(page.getByTestId("reply-restricted")).toHaveText("작성자가 멘션한 사람만 답글을 달 수 있어요", {
    timeout: 30_000,
  });
  await expect(page.getByRole("textbox", { name: /답글/ })).toHaveCount(0);
  await expect(note(page, 71)).toContainText("안건 셋이면 될 것 같아요.");
});

test("someone else's thread offers no way to change who replies or to moderate it", async ({ page }) => {
  await page.goto("/ko/p/yuna/notes/70");
  await note(page, 70).getByRole("button", { name: "노트 메뉴" }).first().click({ timeout: 30_000 });
  await expect(page.getByRole("menuitem", { name: "답글 권한" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await note(page, 71).getByRole("button", { name: "노트 메뉴" }).first().click();
  await expect(page.getByRole("menuitem", { name: "답글 숨기기" })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "답글 지우기" })).toHaveCount(0);
});

test("the thread's writer hides a reply, finds it under 숨긴 답글, and brings it back", async ({ page }) => {
  await page.goto("/ko/p/dohyun/notes/72");
  const toggle = page.getByRole("button", { name: /숨긴 답글/ });
  await expect(toggle).toHaveText("숨긴 답글 1개 보기", { timeout: 30_000 });

  await menu(page, 73, "답글 숨기기");
  await expect(page.getByText("답글을 숨겼어요")).toBeVisible();
  await expect(note(page, 73)).toHaveCount(0);
  await expect(toggle).toHaveText("숨긴 답글 2개 보기");

  await toggle.click();
  const hidden = page.getByTestId("hidden-replies");
  await expect(hidden.locator("article[data-note-id]")).toHaveCount(2);
  await expect(hidden).toContainText("여기 광고 링크 남겨요");

  await menu(page, 73, "숨김 해제");
  await expect(page.getByText("숨긴 답글을 되돌렸어요")).toBeVisible();
  await expect(hidden.locator('article[data-note-id="73"]')).toHaveCount(0);
  await expect(page.locator('section[aria-labelledby="note-replies"] article[data-note-id="73"]')).toHaveCount(1);
});

test("the thread's writer removes someone's reply after confirming", async ({ page }) => {
  await page.goto("/ko/p/dohyun/notes/72");
  await menu(page, 75, "답글 지우기");
  const ask = page.getByRole("dialog", { name: "이 답글을 지울까요?" });
  await expect(ask).toContainText("답글을 쓴 사람에게 알리지 않아요");
  await ask.getByRole("button", { name: "지우기" }).click();
  await expect(page.getByText("답글을 지웠어요")).toBeVisible();
  await expect(note(page, 75)).toHaveCount(0);
  await expect(note(page, 73)).toBeVisible();
});

test("the writer changes who can reply from the note's ⋯ later", async ({ page }) => {
  await page.goto("/ko/p/dohyun/notes/72");
  await menu(page, 72, "답글 권한");
  const dialog = page.getByRole("dialog", { name: "누가 답글을 달 수 있나요?" });
  await expect(dialog.getByRole("radio", { name: "모두" })).toBeChecked();
  await dialog.getByRole("radio", { name: "멘션한 사람만" }).check();
  await dialog.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("답글 권한을 바꿨어요")).toBeVisible();
  await expect(dialog).toHaveCount(0);

  await menu(page, 72, "답글 권한");
  await expect(page.getByRole("dialog", { name: "누가 답글을 달 수 있나요?" }).getByRole("radio", { name: "멘션한 사람만" })).toBeChecked();
});

test("a new note is written with who may reply, and keeps it", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const field = page.getByRole("textbox").first();
  await field.click({ timeout: 30_000 });
  await field.fill("회고 안건은 같이 쓰는 사람만 @haruka");
  const policy = page.getByRole("combobox", { name: "답글 권한" });
  await expect(policy).toHaveValue("everyone");
  await policy.selectOption("mentioned");
  await expect(page.getByTestId("reply-policy-hint")).toHaveText("멘션한 사람은 언제나 답글을 달 수 있어요.");
  await page.getByRole("button", { name: "올리기", exact: true }).click();
  const notice = page.getByRole("dialog").filter({ hasText: "노트는 다른 서버에도 전해져요" });
  await notice.getByRole("button", { name: "알겠어요, 올릴게요" }).click();

  const posted = page.locator("article", { hasText: "회고 안건은 같이 쓰는 사람만" }).first();
  await expect(posted).toBeVisible({ timeout: 30_000 });
  await posted.getByRole("button", { name: "노트 메뉴" }).first().click();
  await page.getByRole("menuitem", { name: "답글 권한", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "누가 답글을 달 수 있나요?" }).getByRole("radio", { name: "멘션한 사람만" })).toBeChecked();
});
