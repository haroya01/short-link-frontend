import { expect, test, type Page } from "@playwright/test";
import { expectOnTop, toastBy } from "./helpers/on-top";

async function preview(page: Page, address: string) {
  await page.goto("/ko/blog/import");
  const input = page.getByLabel("블로그 주소");
  await input.fill(address, { timeout: 30_000 });
  await page.getByRole("button", { name: "미리 보기" }).click();
}

test.describe("blog import", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("a full blog goes from address to imported in one page, and the address keeps the step", async ({ page }) => {
    await preview(page, "seoyeon.tistory.com");
    await expect(page.getByRole("heading", { name: "seoyeon의 개발 노트" })).toBeVisible();
    await expect(page.getByTestId("import-content-kind")).toContainText("글 전체를 가져와요.");
    await expect(page.getByTestId("import-preview-list").getByRole("listitem")).toHaveCount(6);
    await expect(page.getByText("외 3편")).toBeVisible();
    const thumbs = page.getByTestId("import-preview-thumb");
    await expect(thumbs).toHaveCount(2);
    await expect(thumbs.first()).not.toHaveAttribute("referrerpolicy", /.+/);
    await expect(page).toHaveURL(/\?url=seoyeon\.tistory\.com$/);

    await page.getByRole("button", { name: "가져오기", exact: true }).click();
    await expect(page.getByRole("heading", { name: "내 블로그인지 확인해요" })).toBeVisible();
    await expect(page.getByTestId("import-code")).toHaveText(/^kurl-/);
    await expect(page.getByText("티스토리: 관리 › 블로그 › 블로그 설명")).toBeVisible();
    await expect(page.locator("[aria-current=step]")).toHaveText("2. 소유 확인");
    await expect(page).toHaveURL(/\?source=\d+$/);

    await page.reload();
    await expect(page.getByRole("heading", { name: "내 블로그인지 확인해요" })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "확인", exact: true }).click();
    await expect(page.getByRole("progressbar")).toBeVisible();
    await expect(page.getByRole("heading", { name: "글 9편을 가져왔어요" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("앞으로 새 글을 쓰면 가져와서 노트로 알려요.")).toBeVisible();
    await expect(page.getByRole("link", { name: "내 블로그로" })).toHaveAttribute("href", /\/p\/dohyun$/);
  });

  test("an excerpt-only blog says so before anything comes over", async ({ page }) => {
    await preview(page, "https://m.blog.naver.com/haneul");
    await expect(page.getByRole("heading", { name: "haneul님의 블로그" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("import-content-kind")).toContainText(
      "RSS가 요약만 공개돼 있어 요약과 원문 링크로 가져와요.",
    );
    await expect(page.getByText("네이버 블로그 · 글 12편")).toBeVisible();
    await expect(page.getByTestId("import-preview-thumb")).toHaveCount(0);
    await expect(page.getByTestId("import-rss-notes")).toHaveCount(0);
  });

  test("the address step says the RSS has to be public, platform by platform", async ({ page }) => {
    await page.goto("/ko/blog/import");
    const guide = page.getByTestId("import-rss-guide");
    await expect(guide).toContainText("블로그의 RSS가 공개돼 있어야 가져올 수 있어요.", { timeout: 30_000 });
    await expect(guide.getByRole("listitem")).toHaveText([
      "네이버 블로그: 글마다 '외부 보내기 허용'이 켜진 글만 RSS에 나와요.",
      "티스토리: 블로그 관리의 RSS 설정이 '전체 공개'여야 본문까지 가져와요. '부분 공개'면 요약만 와요.",
      "velog · 브런치: RSS가 기본으로 열려 있어요.",
    ]);
    await expect(guide.locator("[data-emphasis]")).toHaveCount(0);
    await expect(page.getByLabel("블로그 주소")).toHaveAttribute("aria-describedby", "import-url-help");

    await preview(page, "notfound.tistory.com");
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      "이 주소에서 글을 찾지 못했어요. 블로그 첫 화면 주소인지 확인해 주세요.",
      { timeout: 30_000 },
    );
    await expect(page.getByTestId("import-rss-guide").locator("[data-emphasis]")).toHaveText(/^티스토리: /);
  });

  test("Naver blocked by its robots rules reads as that, not as a broken address", async ({ page }) => {
    await preview(page, "blog.naver.com/robots");
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      "네이버 블로그는 지금 가져올 수 없어요. 네이버가 RSS 자동 수집을 막고 있어요.",
      { timeout: 30_000 },
    );
  });

  test("a brunch writer is pointed at the one-line intro under the author name", async ({ page }) => {
    await preview(page, "brunch.co.kr/@haneul");
    await page.getByRole("button", { name: "가져오기", exact: true }).click({ timeout: 30_000 });
    await expect(page.getByText("브런치: 프로필 편집 › 작가명 아래 짧은 소개(한 줄)")).toBeVisible();
  });

  test("a thin or summarised preview says what to open in the blog's RSS", async ({ page }) => {
    const notes = page.getByTestId("import-rss-notes").locator("p");
    await preview(page, "blog.naver.com/noposts");
    await expect(page.getByText("네이버 블로그 · 글 0편")).toBeVisible({ timeout: 30_000 });
    await expect(notes).toHaveText([
      "블로그의 RSS가 공개돼 있어야 가져올 수 있어요.",
      "네이버 블로그: 글마다 '외부 보내기 허용'이 켜진 글만 RSS에 나와요.",
    ]);
    await expect(page.getByTestId("import-preview-list")).toHaveCount(0);

    await preview(page, "blog.naver.com/fewposts");
    await expect(page.getByTestId("import-preview-list").getByRole("listitem")).toHaveCount(3, { timeout: 30_000 });
    await expect(notes).toHaveText(["네이버 블로그: 글마다 '외부 보내기 허용'이 켜진 글만 RSS에 나와요."]);

    await preview(page, "partial.tistory.com");
    await expect(page.getByTestId("import-content-kind")).toContainText("RSS가 요약만 공개돼 있어 요약과 원문 링크로 가져와요.", {
      timeout: 30_000,
    });
    await expect(notes).toHaveText(["블로그 관리의 RSS 설정을 '전체 공개'로 바꾸면 본문까지 가져와요."]);

    await preview(page, "velog.io/@noposts");
    await expect(notes).toHaveText(
      ["블로그의 RSS가 공개돼 있어야 가져올 수 있어요.", "velog · 브런치: RSS가 기본으로 열려 있어요."],
      { timeout: 30_000 },
    );

    await preview(page, "fewposts.tistory.com");
    await expect(page.getByTestId("import-preview-list").getByRole("listitem")).toHaveCount(3, { timeout: 30_000 });
    await expect(page.getByTestId("import-rss-notes")).toHaveCount(0);
  });

  for (const [address, message] of [
    ["medium.com/@someone", "네이버 블로그 · 티스토리 · velog · 브런치 주소만 가져올 수 있어요."],
    ["blog.naver.com/notfound", "이 주소에서 글을 찾지 못했어요. 블로그 첫 화면 주소인지 확인해 주세요."],
    ["velog.io/@offline", "블로그에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요."],
    ["brunch.co.kr/@busy", "요청이 많아요. 잠시 뒤 다시 시도해 주세요."],
  ] as const) {
    test(`preview error for ${address} reads by its code`, async ({ page }) => {
      await preview(page, address);
      await expect(page.locator("main").getByRole("alert")).toHaveText(message, { timeout: 30_000 });
      await expect(page.getByLabel("블로그 주소")).toHaveValue(address);
    });
  }

  test("a blog someone else connected and a bio without the code stop with their own words", async ({ page }) => {
    await preview(page, "taken.tistory.com");
    await page.getByRole("button", { name: "가져오기", exact: true }).click({ timeout: 30_000 });
    await expect(page.locator("main").getByRole("alert")).toHaveText("이미 다른 계정에 연결된 블로그예요.");

    await preview(page, "blog.naver.com/nocode");
    await page.getByRole("button", { name: "가져오기", exact: true }).click({ timeout: 30_000 });
    await page.getByRole("button", { name: "확인", exact: true }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      "소개글에서 코드를 찾지 못했어요. 저장한 소개글이 반영되기까지 몇 분 걸릴 수 있어요.",
    );
    await expect(page.getByRole("heading", { name: "내 블로그인지 확인해요" })).toBeVisible();
  });

  test("a visitor previews without signing in and signs in only to import", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-signed-out", "1"));
    await preview(page, "velog.io/@guest");
    await expect(page.getByRole("heading", { name: "guest.log" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "가져오기", exact: true }).click();
    await expectOnTop(page.getByRole("dialog").getByRole("heading", { name: "글을 가져오려면 로그인하세요" }));
    await expect(page).toHaveURL(/\?url=velog\.io%2F%40guest$/);
  });

  test("settings list connected blogs with their state, switches and a disconnect that asks about the posts", async ({ page }) => {
    await page.goto("/ko/blog/settings");
    const section = page.getByRole("region", { name: "연결한 블로그" });
    const velog = section.getByRole("group", { name: "dohyun.log" });
    await expect(velog).toContainText("연결됨", { timeout: 30_000 });
    await expect(velog).toContainText("가져온 글 18편");
    const naver = section.getByRole("group", { name: "도현의 일상 기록" });
    await expect(naver).toContainText("오류");
    await expect(naver).toContainText("블로그에 연결하지 못했어요. 다음 동기화 때 다시 시도해요.");

    const discover = velog.getByRole("switch", { name: "발견에 보이기" });
    await expect(discover).toHaveAttribute("aria-checked", "true");
    await discover.click();
    await expect(discover).toHaveAttribute("aria-checked", "false");
    await page.reload();
    await expect(
      page.getByRole("region", { name: "연결한 블로그" }).getByRole("group", { name: "dohyun.log" }).getByRole("switch", { name: "발견에 보이기" }),
    ).toHaveAttribute("aria-checked", "false", { timeout: 30_000 });

    await page.getByRole("region", { name: "연결한 블로그" }).getByRole("group", { name: "도현의 일상 기록" }).getByRole("button", { name: "연결 끊기" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "도현의 일상 기록 연결을 끊을까요?" })).toBeVisible();
    await expect(dialog.getByRole("radio", { name: "가져온 글 남기기" })).toBeChecked();
    await dialog.getByRole("radio", { name: "가져온 글 42편 삭제" }).check();
    await dialog.getByRole("button", { name: "연결 끊기" }).click();
    await expectOnTop(toastBy(page, "연결을 끊었어요"));
    await expect(page.getByRole("group", { name: "도현의 일상 기록" })).toHaveCount(0);
  });

  test("settings and an empty post list lead to the import page", async ({ page }) => {
    await page.goto("/ko/blog/settings");
    await expect(
      page.getByRole("region", { name: "연결한 블로그" }).getByRole("link", { name: "다른 블로그에 쓴 글 가져오기" }),
    ).toHaveAttribute("href", /\/import$/, { timeout: 30_000 });

    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-empty", "myPosts"));
    await page.goto("/ko/blog/write");
    const empty = page.getByTestId("write-empty");
    await expect(empty).toContainText("아직 작성한 글이 없어요.", { timeout: 30_000 });
    await expect(empty.getByRole("link")).toHaveCount(1);
    await expect(empty.getByRole("link", { name: "다른 블로그에 쓴 글 가져오기" })).toHaveAttribute("href", /\/blog\/import$/);
    await expect(page.locator("header").getByRole("link", { name: "새 글 쓰기" })).toBeVisible();
  });

  test("a visitor's first screen leads to the import page", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("kurl:mock-signed-out", "1"));
    await page.goto("/ko/blog");
    await expect(page.getByRole("link", { name: "다른 블로그에 쓴 글 가져오기" })).toHaveAttribute("href", /\/import$/, {
      timeout: 30_000,
    });
  });
});

test.describe("blog import on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("no step pushes the page sideways", async ({ page }) => {
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await preview(page, "blog.naver.com/a-very-long-blog-identifier-for-wrapping");
    await expect(page.getByTestId("import-preview-list")).toBeVisible({ timeout: 30_000 });
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: "가져오기", exact: true }).click();
    await expect(page.getByTestId("import-code")).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
});
