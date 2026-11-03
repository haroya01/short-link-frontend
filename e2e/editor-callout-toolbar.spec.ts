import { expect, test, type Locator, type Page } from "@playwright/test";

// mock-on 레인: 작성 목의 7002 는 임시저장 글이다.
const KINDS = ["참고", "팁", "중요", "주의", "경고"];

async function openEditor(page: Page, path = "/ko/blog/write/new") {
  await page.goto(path);
  await expect(page.locator(".tiptap")).toBeVisible({ timeout: 30_000 });
}

const css = (el: Locator, prop: string) => el.evaluate((node, p) => getComputedStyle(node).getPropertyValue(p), prop);

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("도구 막대의 박스는 인용 다음에 있고, 고른 종류로 문단을 감싸고, 같은 종류를 다시 고르면 푼다", async ({ page }) => {
    await openEditor(page);
    const toolbar = page.getByTestId("editor-toolbar");
    const labels = await toolbar.locator("button").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    expect(labels[labels.indexOf("인용") + 1]).toBe("박스");

    await page.locator(".tiptap").click();
    await page.keyboard.type("조심할 것");
    const box = toolbar.getByRole("button", { name: "박스", exact: true });
    const menu = page.getByRole("menu", { name: "박스" });
    await box.click();
    await expect(menu.getByRole("menuitemradio")).toHaveText(KINDS);
    await expect(page.locator(".tiptap")).toBeFocused();
    await menu.getByRole("menuitemradio", { name: "주의" }).click();
    await expect(menu).toHaveCount(0);
    await expect(page.locator(".tiptap blockquote[data-alert='warning']")).toHaveText("조심할 것");
    await expect(toolbar.getByRole("button", { name: "인용", exact: true })).toHaveAttribute("aria-pressed", "false");

    await box.click();
    await expect(menu.getByRole("menuitemradio", { name: "주의" })).toHaveAttribute("aria-checked", "true");
    await menu.getByRole("menuitemradio", { name: "팁" }).click();
    await expect(page.locator(".tiptap blockquote[data-alert='tip']")).toHaveText("조심할 것");

    await box.click();
    await menu.getByRole("menuitemradio", { name: "팁" }).click();
    await expect(page.locator(".tiptap blockquote")).toHaveCount(0);
    await expect(page.locator(".tiptap p").first()).toHaveText("조심할 것");
  });

  test("박스 메뉴는 화살표로 다니고, Esc 로 닫으면 박스 버튼으로 돌아간다", async ({ page }) => {
    await openEditor(page);
    await page.locator(".tiptap").click();
    await page.keyboard.type("한 줄");
    const box = page.getByTestId("editor-toolbar").getByRole("button", { name: "박스", exact: true });
    await box.focus();
    await page.keyboard.press("Enter");
    const items = page.getByRole("menu", { name: "박스" }).getByRole("menuitemradio");
    await expect(items.first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press("End");
    await expect(items.last()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(items).toHaveCount(0);
    await expect(box).toBeFocused();
  });

  test("블록 메뉴의 전환에서도 박스 종류를 고른다", async ({ page }) => {
    await openEditor(page, "/ko/blog/write/7002");
    const first = page.locator(".tiptap > p").first();
    const text = (await first.textContent())!;
    await first.hover();
    await page.getByRole("button", { name: "드래그로 이동 · 클릭으로 메뉴" }).click();
    const menu = page.getByRole("menu");
    for (const kind of KINDS) await expect(menu.getByRole("menuitem", { name: kind, exact: true })).toBeVisible();
    await menu.getByRole("menuitem", { name: "중요", exact: true }).click();
    await expect(page.locator(".tiptap blockquote[data-alert='important']")).toHaveText(text);
  });

  test("글쓰기 화면은 장식 상자 없이 여백과 선으로 묶는다", async ({ page }) => {
    await page.goto("/ko/blog/write");
    const resume = page.getByRole("link", { name: /이어서 쓰기/ });
    await expect(resume).toBeVisible({ timeout: 30_000 });
    expect(await css(resume, "border-top-width")).toBe("0px");
    await expect(resume.locator("svg")).toHaveCount(0);
    const draft = page.locator("main li").getByText("임시저장", { exact: true }).first();
    expect(await css(draft, "background-color")).toBe("rgba(0, 0, 0, 0)");

    await openEditor(page, "/ko/blog/write/7002");
    await page.getByRole("button", { name: "발행", exact: true }).click();
    const preview = page.getByRole("dialog", { name: "발행 설정" }).getByRole("region", { name: "이렇게 보여요" });
    const boxed = await preview.locator("*").evaluateAll((els) =>
      els.filter((el) => {
        const s = getComputedStyle(el);
        return el.getClientRects().length > 0 && s.borderTopWidth !== "0px" && s.borderLeftWidth !== "0px";
      }).length,
    );
    expect(boxed).toBe(0);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("박스를 더해도 도구 막대의 가로 스크롤 폭은 늘지 않고, 메뉴는 화면 안에 열린다", async ({ page }) => {
    await openEditor(page);
    const toolbar = page.getByTestId("editor-toolbar");
    expect(await toolbar.evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual(536);

    await page.locator(".tiptap").click();
    await toolbar.getByRole("button", { name: "박스", exact: true }).click();
    const menu = page.getByRole("menu", { name: "박스" });
    await expect(menu).toBeVisible();
    const box = (await menu.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });
});
