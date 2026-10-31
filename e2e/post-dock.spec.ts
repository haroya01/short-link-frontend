import { expect, test, type Page } from "@playwright/test";

// mock-on 레인: 1100px 아래(휴대폰·세로 태블릿)에선 글 동작(목차·엮기·좋아요·북마크)이 오른쪽 아래 떠 있는
// 독으로 가고, 1100px 이상은 헤더의 아이콘 줄을 쓴다.
const POST = "/ko/p/dohyun/nextjs-14-app-router-blog";
const PHONE = { width: 390, height: 844 };

const dock = (page: Page) => page.getByTestId("post-dock");

test("휴대폰은 헤더 대신 독에 목차·엮기·좋아요·북마크가 있고, 데스크톱은 헤더 줄 그대로다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(POST);
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await page.mouse.wheel(0, 400);
  await expect(dock(page)).toHaveAttribute("data-tucked", "true");
  await page.mouse.wheel(0, -200);
  await expect(dock(page)).not.toHaveAttribute("data-tucked", "true");
  await expect(dock(page).getByRole("button")).toHaveText(["", "", /^\d+$/, ""]);
  await expect(dock(page).getByRole("button", { name: "목차" })).toBeVisible();
  await expect(dock(page).getByRole("button", { name: /컬렉션에 엮기$/ })).toBeVisible();
  await expect(dock(page).getByRole("button", { name: /글 좋아요$/ })).toBeVisible();
  await expect(dock(page).getByRole("button", { name: "북마크에 저장" })).toBeVisible();
  const header = page.locator("article header").first();
  await expect(header.getByRole("button", { name: /글 좋아요$/ })).toBeHidden();
  await expect(header.getByRole("button", { name: "북마크에 저장" })).toBeHidden();

  const like = dock(page).getByRole("button", { name: /글 좋아요$/ });
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(dock(page)).toBeHidden();
  await expect(header.getByRole("button", { name: /글 좋아요$/ })).toHaveAttribute("aria-pressed", "true");
  await expect(header.getByRole("button", { name: "북마크에 저장" })).toBeVisible();
});

test("독은 글 첫 화면에선 접혀 본문을 가리지 않고, 읽어 내려가는 동안에도 접혀 있다가, 위로 올리면 탭 위로 나온다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(POST);
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  const nav = page.locator(".vt-bottom-nav");
  const aboveNav = async () => {
    const d = (await dock(page).boundingBox())!;
    const n = (await nav.boundingBox())!;
    expect(d.y + d.height).toBeLessThanOrEqual(n.y - 8);
  };
  await expect(dock(page)).toHaveAttribute("data-tucked", "true");
  await expect(dock(page)).toHaveCSS("opacity", "0");

  await page.mouse.wheel(0, 600);
  await expect(dock(page)).toHaveAttribute("data-tucked", "true");
  await expect(dock(page)).toHaveCSS("opacity", "0");
  await expect(dock(page)).not.toHaveAttribute("aria-hidden", "true");
  await page.waitForTimeout(800);
  await expect(dock(page)).toHaveAttribute("data-tucked", "true");
  await expect(dock(page)).toHaveCSS("opacity", "0");

  await page.mouse.wheel(0, -200);
  await expect(dock(page)).not.toHaveAttribute("data-tucked", "true");
  await expect(dock(page)).toHaveCSS("opacity", "1");
  await expect(nav).not.toHaveClass(/translate-y-full/);
  await expect(aboveNav).toPass();

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(dock(page)).toHaveAttribute("data-tucked", "true");
});

test("움직임 줄이기에서도 읽는 동안 독은 숨되, 미끄러지지 않고 바로 숨는다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(POST);
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await expect(dock(page)).toHaveCSS("transition-property", "none");
  await expect(dock(page)).toHaveAttribute("data-tucked", "true");
  await page.mouse.wheel(0, 600);
  await expect(dock(page)).toHaveAttribute("data-tucked", "true");
  await expect(dock(page)).toHaveCSS("opacity", "0");
});

test("읽는 동안 숨은 독도 키보드로 들어가면 다시 보인다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(POST);
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await page.mouse.wheel(0, 600);
  await expect(dock(page)).toHaveAttribute("data-tucked", "true");
  await dock(page).getByRole("button", { name: /글 좋아요$/ }).focus();
  await expect(dock(page)).toHaveCSS("opacity", "1");
});

test("목차 버튼은 제목 시트를 열고, 제목을 고르면 시트가 닫히며 그 자리로 간다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(POST);
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await page.mouse.wheel(0, 400);
  await expect(dock(page)).toHaveAttribute("data-tucked", "true");
  await page.mouse.wheel(0, -200);
  await dock(page).getByRole("button", { name: "목차" }).click();
  const sheet = page.getByRole("dialog", { name: "목차" });
  await expect(sheet).toBeVisible();
  const link = sheet.getByRole("link").nth(1);
  const id = (await link.getAttribute("href"))!.slice(1);
  await link.click();
  await expect(sheet).toBeHidden();
  await expect(page.locator(`[id="${id}"]`)).toBeInViewport();
});

test("글 끝에 닿으면 독이 물러나고, 본문으로 올라오면 다시 뜬다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(POST);
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await expect(dock(page)).not.toHaveAttribute("data-away", "true");

  await page.locator("[data-post-end]").scrollIntoViewIfNeeded();
  await expect(dock(page)).toHaveAttribute("data-away", "true");
  await expect(dock(page).getByRole("button", { name: /글 좋아요$/ })).toHaveCount(0);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(dock(page)).not.toHaveAttribute("data-away", "true");
  await expect(dock(page).getByRole("button", { name: /글 좋아요$/ })).toBeVisible();
});

test("아래 붙은 댓글 작성기가 열려 있는 동안 독이 물러난다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(POST);
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await page.locator("#comments").getByRole("button", { name: "답글", exact: true }).first().click();
  await expect(page.locator("[data-testid='conversation-composer'] textarea")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(dock(page)).toHaveAttribute("data-away", "true");

  await page.locator("[data-testid='conversation-composer']").getByRole("button", { name: "닫기" }).click();
  await expect(dock(page)).not.toHaveAttribute("data-away", "true");
});

test("독만큼 글 아래 여백이 있어 마지막 줄이 독에 가리지 않는다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(POST);
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const dockH = document.querySelector("[data-testid=post-dock]")!.getBoundingClientRect().height;
        const padding = parseFloat(getComputedStyle(document.querySelector("article")!).paddingBottom);
        return padding - (dockH + 12);
      }),
    )
    .toBeGreaterThanOrEqual(0);
});

test("휴대폰 헤더의 ⋯에 공유·노트로 인용이 있고, 데스크톱에선 공유가 아이콘 줄로 가고 인용은 ⋯에 남는다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto("/ko/p/haruka/hexagonal-too-much");
  const header = page.locator("article header").first();
  await expect(dock(page)).toBeVisible({ timeout: 30_000 });
  await expect(header.getByRole("button", { name: "공유" })).toBeHidden();
  await expect(page.getByTestId("post-actions").getByRole("button", { name: "공유" })).toBeAttached();
  await header.getByRole("button", { name: "글 메뉴", exact: true }).click();
  await expect(page.getByRole("menuitem")).toHaveText(["공유", "노트로 인용", "차단", "신고"]);
  await page.getByRole("menuitem", { name: "노트로 인용" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload();
  await header.getByRole("button", { name: "글 메뉴", exact: true }).click({ timeout: 30_000 });
  await expect(page.getByRole("menuitem")).toHaveText(["노트로 인용", "차단", "신고"]);
  const actions = page.getByTestId("post-actions");
  await expect(actions.getByRole("button", { name: "공유" })).toBeVisible();
  await expect(actions.getByRole("button", { name: "노트로 인용" })).toHaveCount(0);
});

test("내 글의 ⋯은 수정·삭제가 먼저이고, 휴대폰에선 공유·노트로 인용이 뒤따른다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(POST);
  const header = page.locator("article header").first();
  await header.getByRole("button", { name: "글 메뉴", exact: true }).click({ timeout: 30_000 });
  await expect(page.getByRole("menuitem")).toHaveText(["수정", "삭제", "공유", "노트로 인용"]);
});

for (const viewport of [PHONE, { width: 1440, height: 900 }]) {
  test(`${viewport.width}px 글 끝은 태그 → 반응 줄 → 다음 편 → 작가 카드 → 댓글 → 담긴 컬렉션 → 다음 읽을 글 순서다`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/ko/p/haruka/hexagonal-too-much");
    await expect(page.getByText("이 글이 담긴 컬렉션")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("post-actions")).toBeVisible();
    await expect(page.getByTestId("post-author-card")).toBeVisible();
    const top = async (loc: ReturnType<Page["locator"]>) => (await loc.evaluate((el) => el.getBoundingClientRect().top + window.scrollY));
    const order = [
      await top(page.getByTestId("post-tags")),
      await top(page.getByTestId("post-actions")),
      await top(page.getByRole("link", { name: "시리즈 전체 3편 보기" })),
      await top(page.locator("[data-post-end]")),
      await top(page.getByTestId("post-author-card")),
      await top(page.locator("#comments")),
      await top(page.getByText("이 글이 담긴 컬렉션")),
      await top(page.getByRole("heading", { name: "다음 읽을 글" })),
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    await expect(page.getByText("엮인 것", { exact: true })).toHaveCount(0);
    await expect(page.getByText("이 글을 엮은 사람", { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("post-author-card").getByRole("button", { name: /팔로우/ })).toBeVisible();
    await expect(page.locator("article").getByRole("link", { name: "@haruka님의 다른 글" })).toHaveCount(0);
  });
}

test("나를 차단한 작가의 글엔 휴대폰 독도 없다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto("/ko/p/rin/quiet-hours");
  await expect(page.getByTestId("author-unavailable")).toBeVisible({ timeout: 30_000 });
  await expect(dock(page)).toHaveCount(0);
  await expect(page.getByTestId("post-author-card")).toHaveCount(0);
  await expect(page.getByTestId("post-actions")).toHaveCount(0);
});

test("휴대폰 글 끝 섹션은 본문 h2 와 같은 32px 간격으로 이어지고, 마지막 회차의 '시리즈 전체 보기'는 행이다", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto("/ko/p/haruka/hexagonal-too-much");
  const all = page.getByRole("link", { name: "시리즈 전체 3편 보기" });
  await expect(all).toBeVisible({ timeout: 30_000 });
  const row = (await all.boundingBox())!;
  expect(row.height).toBeGreaterThanOrEqual(44);
  expect(row.width).toBeGreaterThan(PHONE.width - 64);

  const sections = [
    page.locator("aside").filter({ has: all }),
    page.getByTestId("post-author-card"),
    page.locator("section#comments"),
    page.locator("section").filter({ has: page.getByText("이 글이 담긴 컬렉션") }),
    page.locator("section[aria-label='다음 읽을 글']"),
  ];
  await expect(sections[4]).toBeVisible();
  const tags = (await page.getByTestId("post-tags").boundingBox())!;
  const actions = (await page.getByTestId("post-actions").boundingBox())!;
  expect(Math.round(actions.y - (tags.y + tags.height))).toBe(32);
  let above = actions.y + actions.height;
  for (const section of sections) {
    const box = (await section.boundingBox())!;
    expect(Math.round(box.y - above)).toBe(32);
    expect(await section.evaluate((el) => getComputedStyle(el).paddingTop)).toBe("24px");
    above = box.y + box.height;
  }
});
