import { expect, test, type Page } from "@playwright/test";

// mock-on 레인: 댓글 1(민지)과 3(kazuki)이 맨 위 댓글, 2·4 는 1 의 답글이다.
const POST = "/ko/p/dohyun/nextjs-14-app-router-blog";

const composer = (page: Page) => page.locator("#comments [data-testid='conversation-composer']");
const field = (page: Page) => composer(page).locator("textarea");
const replyOn = (page: Page, id: number) =>
  page.locator(`#comment-${id}`).getByRole("button", { name: "답글", exact: true });

test.describe("휴대폰", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("답글 작성기는 아래에 붙되 하단 탭과 겹치지 않고, 마지막 댓글이 그 위로 올라온다", async ({ page }) => {
    await page.goto(POST);
    await replyOn(page, 1).click({ timeout: 20_000 });
    const form = page.getByTestId("conversation-composer");
    await expect(page.getByTestId("composer-replying-to")).toHaveText("@minji에게 답글");
    await expect(form.locator("textarea")).toBeFocused();

    const layout = await form.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const nav = document.querySelector(".vt-bottom-nav")?.getBoundingClientRect();
      const section = document.getElementById("comments")!;
      return {
        position: getComputedStyle(el).position,
        bottom: box.bottom,
        navTop: nav && nav.height > 0 && nav.top < window.innerHeight ? nav.top : window.innerHeight,
        height: box.height,
        padding: parseFloat(getComputedStyle(section).paddingBottom),
      };
    });
    expect(layout.position).toBe("fixed");
    expect(layout.bottom).toBeLessThanOrEqual(layout.navTop + 1);
    expect(Math.abs(layout.padding - layout.height)).toBeLessThanOrEqual(1);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const formTop = await form.evaluate((el) => el.getBoundingClientRect().top);
    const lastBottom = await page.locator("#comments [data-conversation-row]").last().evaluate((el) => el.getBoundingClientRect().bottom);
    expect(lastBottom).toBeLessThanOrEqual(formTop);
  });
});

test.describe("데스크톱", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("작성기는 목록 맨 위에 하나, 답글 대상을 바꿔도 쓰던 글은 대상별로 남는다", async ({ page }) => {
    await page.goto(POST);
    await replyOn(page, 1).click({ timeout: 20_000 });
    expect(await composer(page).evaluate((el) => getComputedStyle(el).position)).not.toBe("fixed");
    const composerTop = await composer(page).evaluate((el) => el.getBoundingClientRect().top);
    const firstTop = await page.locator("#comment-1").evaluate((el) => el.getBoundingClientRect().top);
    expect(composerTop).toBeLessThan(firstTop);
    await expect(composer(page)).toHaveCount(1);

    await field(page).fill("민지에게 쓰던 답글");
    await replyOn(page, 3).click();
    await expect(page.getByTestId("composer-replying-to")).toHaveText("@kazuki에게 답글");
    await expect(field(page)).toHaveValue("");
    await field(page).fill("kazuki에게 쓰던 답글");

    await replyOn(page, 1).click();
    await expect(field(page)).toHaveValue("민지에게 쓰던 답글");

    await composer(page).getByRole("button", { name: "답글 취소" }).click();
    await expect(page.getByTestId("composer-replying-to")).toHaveCount(0);
    await expect(composer(page).getByRole("textbox", { name: "댓글 쓰기" })).toHaveValue("");

    await page.reload();
    await replyOn(page, 3).click({ timeout: 20_000 });
    await expect(field(page)).toHaveValue("kazuki에게 쓰던 답글");
  });

  test("답글을 올리면 그 스레드 아래에 붙고, 화면 읽기 프로그램에 알린다", async ({ page }) => {
    await page.goto(POST);
    await replyOn(page, 3).click({ timeout: 20_000 });
    await field(page).fill("스레드에 붙는 답글");
    await page.keyboard.press("Control+Enter");
    await expect(page.getByTestId("conversation-announce")).toHaveText("답글을 올렸어요");
    await expect(page.locator("#comment-3").locator("xpath=ancestor::li[1]").getByText("스레드에 붙는 답글")).toBeVisible();
    await expect(composer(page)).toHaveCount(0);
  });
});
