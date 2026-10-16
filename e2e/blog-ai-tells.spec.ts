import { expect, test, type Locator, type Page } from "@playwright/test";

// mock-on 레인: 초록(강조색)은 다섯 자리뿐이다(decisions 2026-10-13 ai-tells-visual-sweep). 형광펜 칠, 읽기 진행,
// 화면마다 주요 버튼 하나, 본문 안 링크·멘션·해시태그, 눌린 반응·선택 체크. 그 밖의 막대·배지·아이콘·머리·윤곽은
// 잉크나 보조 회색이고, 알약 묶음은 글자 줄이나 잉크 밑줄 탭이다.

const GREENS = ["5, 150, 105", "4, 120, 87", "16, 185, 129", "52, 211, 153", "110, 231, 183", "6, 95, 70", "167, 243, 208", "209, 250, 229", "236, 253, 245", "6, 78, 59"];
const isGreen = (color: string) => GREENS.some((g) => color.includes(`(${g}`));
const css = (loc: Locator, prop: string) => loc.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

async function greenFills(page: Page): Promise<string[]> {
  return page.evaluate((greens) => {
    const inView = (r: DOMRect) => r.width > 8 && r.height > 8 && r.bottom > 0 && r.top < window.innerHeight;
    return [...document.querySelectorAll<HTMLElement>("a, button")]
      .filter((el) => !el.closest("header.vt-app-header [aria-haspopup='menu']"))
      .filter((el) => {
        const bg = getComputedStyle(el).backgroundColor;
        return greens.some((g) => bg.includes(`(${g}`)) && inView(el.getBoundingClientRect());
      })
      .map((el) => (el.getAttribute("aria-label") || el.textContent || "").trim());
  }, GREENS);
}

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the header's 글쓰기 is a quiet ink icon, so a post screen keeps one green fill", async ({ page }) => {
    await page.goto("/ko/p/haruka/hexagonal-too-much");
    const compose = page.locator('header.vt-app-header [data-compose-trigger="mobile"]');
    await expect(compose).toBeVisible({ timeout: 30_000 });
    expect(isGreen(await css(compose, "background-color"))).toBe(false);
    expect(isGreen(await css(compose, "color"))).toBe(false);
    await expect.poll(() => greenFills(page)).toHaveLength(1);
  });

  test("a resting search sheet lists trending posts as rows and who to follow with quiet outlines, no tag pills", async ({ page }) => {
    await page.goto("/ko/blog");
    await page.locator("nav.vt-bottom-nav").getByRole("button", { name: "검색" }).click({ timeout: 30_000 });
    const sheet = page.getByRole("dialog", { name: "검색" });
    const trending = sheet.getByTestId("search-idle-trending");
    await expect(trending.getByRole("heading", { name: "지금 뜨는 글" })).toBeVisible();
    const rows = trending.locator("a[data-bhv='post']");
    await expect(rows.first()).toBeVisible();
    const posts = new Set(await rows.evaluateAll((els) => els.map((el) => el.getAttribute("href"))));
    expect(posts.size).toBeGreaterThan(0);
    expect(posts.size).toBeLessThanOrEqual(5);
    const follow = sheet.getByTestId("search-idle-follow");
    await expect(follow.getByRole("heading", { name: "팔로우 추천" })).toBeVisible();
    const button = follow.getByTestId("follow-button").first();
    await expect(button).toHaveText("팔로우");
    expect(isGreen(await css(button, "background-color"))).toBe(false);
    expect(isGreen(await css(button, "border-top-color"))).toBe(false);
    await expect(sheet.getByRole("heading", { name: "인기 태그" })).toHaveCount(0);
  });

  test("a search sheet query labels posts in grey and ends in a plain text link to every result", async ({ page }) => {
    await page.goto("/ko/blog");
    await page.locator("nav.vt-bottom-nav").getByRole("button", { name: "검색" }).click({ timeout: 30_000 });
    const sheet = page.getByRole("dialog", { name: "검색" });
    await sheet.getByRole("searchbox", { name: "검색" }).fill("har");
    const topic = sheet.getByText("개발", { exact: true }).first();
    await expect(topic).toBeVisible({ timeout: 10_000 });
    expect(isGreen(await css(topic, "color"))).toBe(false);
    const all = sheet.getByRole("button", { name: "‘har’ 검색 결과" });
    await expect(all).toBeVisible();
    expect(isGreen(await css(all, "color"))).toBe(false);
    expect(isGreen(await css(all, "background-color"))).toBe(false);
    await expect(all.locator("svg")).toHaveCount(0);
  });

  test("the compose chooser is names only", async ({ page }) => {
    await page.goto("/ko/blog");
    await page.locator('header.vt-app-header [data-compose-trigger="mobile"]').click({ timeout: 30_000 });
    const choices = page.locator("[data-compose-choice]");
    await expect(choices.first()).toBeVisible();
    await expect(choices.locator("svg")).toHaveCount(0);
  });
});

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("a post's quote bar, inline code and bullets are ink, and the series box has no green bar", async ({ page }) => {
    await page.goto("/ko/p/dohyun/nextjs-14-app-router-blog");
    const quote = page.locator(".prose-post blockquote").first();
    await expect(quote).toBeVisible({ timeout: 30_000 });
    expect(isGreen(await css(quote, "border-left-color"))).toBe(false);
    const inlineCode = await page.locator(".prose-post").first().evaluate((prose) => {
      const p = prose.appendChild(document.createElement("p"));
      const code = p.appendChild(document.createElement("code"));
      code.textContent = "const x";
      const color = getComputedStyle(code).color;
      p.remove();
      return color;
    });
    expect(isGreen(inlineCode)).toBe(false);
    const marker = await page.locator(".prose-post ul > li").first().evaluate((el) => getComputedStyle(el, "::marker").color);
    expect(isGreen(marker)).toBe(false);
    const series = page.locator("article nav").filter({ hasText: "Next.js 깊게 파기" }).first();
    expect(await css(series, "border-left-width")).toBe("0px");
    await expect(series.locator("svg.lucide-layers")).toHaveCount(0);
  });

  test("notifications carry grey type glyphs and answer follow requests with two equal outlines", async ({ page }) => {
    await page.goto("/ko/blog/notifications");
    const approve = page.getByTestId("follow-request-approve").first();
    await expect(approve).toBeVisible({ timeout: 30_000 });
    const reject = page.getByTestId("follow-request-reject").first();
    expect(isGreen(await css(approve, "background-color"))).toBe(false);
    expect(await css(approve, "border-top-width")).toBe(await css(reject, "border-top-width"));
    const glyphs = await page.locator("li svg").evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
    expect(glyphs.length).toBeGreaterThan(3);
    expect(glyphs.filter(isGreen)).toEqual([]);
    expect(isGreen(await css(page.getByRole("button", { name: "모두 읽음" }), "color"))).toBe(false);
  });

  test("a topic page lists other topics as a text row, the current one marked, not as pills", async ({ page }) => {
    await page.goto("/ko/blog/tags/%EA%B0%9C%EB%B0%9C");
    const row = page.getByRole("navigation", { name: "인기 태그" });
    const current = row.getByRole("link", { name: /#개발/ });
    await expect(current).toHaveAttribute("aria-current", "page", { timeout: 30_000 });
    const others = row.getByRole("link").filter({ hasNot: page.locator("[aria-current]") });
    for (const link of [current, others.first()]) {
      expect(await css(link, "background-color")).toBe("rgba(0, 0, 0, 0)");
      expect(await css(link, "border-top-width")).toBe("0px");
    }
    await expect(page.getByText("이 주제로 발행된 글을 모았어요.")).toHaveCount(0);
  });

  test("the library switches folders with ink-underline tabs and its section icons are grey", async ({ page }) => {
    await page.goto("/ko/blog/curation");
    const all = page.getByRole("button", { name: /^전체/ });
    await expect(all).toHaveAttribute("aria-pressed", "true", { timeout: 30_000 });
    expect(await css(all, "background-color")).toBe("rgba(0, 0, 0, 0)");
    expect(await css(all, "border-bottom-width")).toBe("2px");
    const icons = await page.locator("main h2 svg").evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
    expect(icons.length).toBeGreaterThan(0);
    expect(icons.filter(isGreen)).toEqual([]);
  });

  test("analytics reads as a plain ink line with ink numbers and bare labels", async ({ page }) => {
    await page.goto("/ko/blog/analytics");
    const chart = page.locator(".recharts-wrapper").first();
    await expect(chart).toBeVisible({ timeout: 30_000 });
    await expect(chart.locator("linearGradient")).toHaveCount(0);
    await expect(chart.locator(".recharts-area")).toHaveCount(0);
    const line = chart.locator(".recharts-line-curve").first();
    expect(isGreen(await css(line, "stroke"))).toBe(false);
    const hero = page.getByText("742", { exact: true }).first();
    expect(isGreen(await css(hero, "color"))).toBe(false);
    await expect.poll(() => greenFills(page)).toEqual([]);
  });

  test("the notes rail draws its trend bars grey and offers follows as quiet outlines on one line", async ({ page }) => {
    await page.goto("/ko/blog/notes");
    const tags = page.getByTestId("trending-note-tags");
    await expect(tags).toBeVisible({ timeout: 30_000 });
    const bars = await tags.locator("span[style*='height']").evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
    expect(bars.length).toBeGreaterThan(0);
    expect(bars.filter(isGreen)).toEqual([]);
    const suggestion = page.getByTestId("suggestion-haruka");
    const follow = suggestion.getByTestId("follow-button");
    expect(isGreen(await css(follow, "border-top-color"))).toBe(false);
    const name = (await suggestion.getByRole("link").first().boundingBox())!;
    const button = (await follow.boundingBox())!;
    expect(Math.abs(button.y + button.height / 2 - (name.y + name.height / 2))).toBeLessThan(12);
    const remote = page.getByTestId("remote-suggestion-sora@fosstodon.org");
    await expect(remote).toBeVisible();
    const remoteName = (await remote.getByRole("link").boundingBox())!;
    const remoteFollow = (await remote.getByRole("button", { name: "팔로우" }).boundingBox())!;
    expect(Math.abs(remoteFollow.y + remoteFollow.height / 2 - (remoteName.y + remoteName.height / 2))).toBeLessThan(12);
    expect(Math.abs(remoteFollow.x + remoteFollow.width - (button.x + button.width))).toBeLessThan(1);
  });
});

test.describe("one icon per comment row", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("on my post, someone else's comment keeps 삭제 inside its ⋯, and my own comment keeps its single trash", async ({ page }) => {
    await page.goto("/ko/p/dohyun/nextjs-14-app-router-blog");
    const theirs = page.locator("#comment-1");
    await expect(theirs).toContainText("minji", { timeout: 30_000 });
    await expect(theirs.getByRole("button", { name: "삭제" })).toHaveCount(0);
    await theirs.getByRole("button", { name: "댓글 메뉴" }).click();
    await expect(theirs.getByRole("menuitem")).toHaveText(["차단", "삭제"]);
    await theirs.getByRole("menuitem", { name: "삭제" }).click();
    await expect(page.getByRole("dialog", { name: "이 댓글을 삭제할까요?" })).toBeVisible();
    await page.keyboard.press("Escape");

    const mine = page.locator("#comment-2");
    await expect(mine.getByRole("button", { name: "댓글 메뉴" })).toHaveCount(0);
    await expect(mine.getByRole("button", { name: "삭제" })).toHaveCount(1);
  });
});
