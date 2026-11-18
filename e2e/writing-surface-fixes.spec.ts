import { test, expect, type Locator, type Page } from "@playwright/test";

const NEW = "/ko/blog/write/new";
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
const TITLE_MISSING = "발행하려면 제목을 입력해주세요";
const LINK_DIALOG = "링크 넣기";

const body = (page: Page) => page.locator(".tiptap");
const toolbar = (page: Page) => page.getByTestId("editor-toolbar");
const bubble = (page: Page) => page.getByTestId("bubble-bar");
const address = (page: Page) => page.getByRole("dialog", { name: LINK_DIALOG }).getByLabel("주소", { exact: true });
const drawsOutline = (target: Locator) =>
  target.evaluate((el) => {
    const style = getComputedStyle(el);
    const alpha = style.outlineColor.match(/rgba\([^)]*,\s*([\d.]+)\)$/);
    return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0 && (!alpha || Number(alpha[1]) > 0);
  });
const box = async (target: Locator) => (await target.boundingBox())!;
const frames = (page: Page) =>
  page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "cookie-consent", value: "rejected", url: baseURL ?? "http://localhost:3001" }]);
});

async function openEditor(page: Page, path = NEW) {
  await page.goto(path);
  await expect(body(page)).toBeVisible({ timeout: 30_000 });
}

async function openHome(page: Page) {
  await page.goto("/ko/blog");
  const field = page.getByPlaceholder("노트 쓰기");
  await expect(field).toBeVisible({ timeout: 30_000 });
  return field;
}

async function paste(page: Page, text: string) {
  await body(page).evaluate((node, text) => {
    const data = new DataTransfer();
    data.setData("text/plain", text);
    node.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
  }, text);
}

async function selectLine(page: Page, text: string) {
  await page.keyboard.type(text);
  await body(page).locator("p").last().click({ clickCount: 3 });
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString().trim())).toBe(text);
  await expect(bubble(page)).toBeVisible();
  await frames(page);
}

async function linkDialog(page: Page) {
  const dialog = page.getByRole("dialog", { name: LINK_DIALOG });
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await frames(page);
  return dialog;
}

async function insertAndSelectPhoto(page: Page) {
  const pixel = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.locator('input[type="file"]').first().setInputFiles({ name: "dot.png", mimeType: "image/png", buffer: pixel });
  const figure = body(page).locator("figure.tiptap-figure");
  await expect(figure).toHaveCount(1);
  await frames(page);
  await page.keyboard.press("ArrowUp");
  await expect(figure).toHaveClass(/ProseMirror-selectednode/);
  return figure;
}

// The runner's desktop profile reports a Windows platform, so the editor's select-all is Control+A on every host.
async function clearAll(page: Page) {
  await body(page).click();
  await page.keyboard.type("지울 글");
  await page.keyboard.press("Control+a");
  await expect(bubble(page)).toBeVisible();
  await page.keyboard.press("Backspace");
  await expect(body(page)).toHaveText("");
}

for (const [name, device] of [
  ["desktop", DESKTOP],
  ["phone", PHONE],
] as const) {
  test.describe(`${name}: 글 쓰는 칸`, () => {
    test.use(device);

    test("제목 칸은 포커스를 받아도 테두리 상자가 생기지 않는다", async ({ page }) => {
      await openEditor(page);
      const title = page.getByPlaceholder("제목");
      await title.click();
      await page.keyboard.type("제목");
      await expect(title).toBeFocused();
      expect(await drawsOutline(title)).toBe(false);
    });

    test("태그 칸은 포커스를 받아도 안쪽에 테두리 상자가 겹치지 않는다", async ({ page }) => {
      await openEditor(page);
      await page.getByRole("button", { name: "+ 태그 추가" }).click();
      const tag = page.getByPlaceholder("태그 입력 후 Enter");
      await expect(tag).toBeFocused();
      expect(await drawsOutline(tag)).toBe(false);
    });

    test("노트 칸은 포커스를 받아도 테두리 상자가 생기지 않는다", async ({ page }) => {
      const note = await openHome(page);
      await note.click();
      await page.keyboard.type("노트");
      await expect(note).toBeFocused();
      expect(await drawsOutline(note)).toBe(false);
    });

    test("짧은 글 아래 빈 곳을 누르면 글 끝에 커서가 놓인다", async ({ page }) => {
      await openEditor(page);
      const { width, height } = page.viewportSize()!;
      await page.mouse.click(width / 2, height - 40);
      await expect(body(page)).toBeFocused();
      await page.keyboard.type("빈 곳에서 시작");
      await expect(body(page)).toHaveText("빈 곳에서 시작");

      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");
      await page.keyboard.type("둘째 문단");
      await page.getByPlaceholder("제목").click();
      await page.mouse.click(width / 2, height - 40);
      await expect(body(page)).toBeFocused();
      await page.keyboard.type(" 끝");
      await expect(body(page).locator("p").last()).toHaveText("둘째 문단 끝");
    });

    test("글 옆 여백을 눌러서는 커서가 글 끝으로 옮겨 가지 않는다", async ({ page }) => {
      await openEditor(page);
      await body(page).click();
      await page.keyboard.type("첫 문단");
      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");
      await page.keyboard.type("둘째 문단");
      await body(page).locator("p").first().click();
      const first = await box(body(page).locator("p").first());
      await page.mouse.click(first.x + first.width + 10, first.y + first.height / 2);
      await page.keyboard.type("!");
      await expect(body(page).locator("p").last()).toHaveText("둘째 문단");
    });

    test("첫 줄을 선택해도 서식 버블이 툴바를 가리지 않는다", async ({ page }) => {
      await openEditor(page);
      await body(page).click();
      await selectLine(page, "첫 줄에서 고른 글자");
      const bar = await box(toolbar(page));
      const floating = await box(bubble(page));
      const line = await box(body(page).locator("p").first());
      expect(floating.y).toBeGreaterThanOrEqual(bar.y + bar.height);
      expect(floating.y).toBeGreaterThanOrEqual(line.y + line.height - 1);
    });
  });
}

test.describe("desktop: 편집기", () => {
  test.use(DESKTOP);

  test("키보드로 옮긴 포커스는 버튼에 잉크 테두리를 그대로 남긴다", async ({ page }) => {
    await openEditor(page);
    await page.getByPlaceholder("제목").click();
    await page.keyboard.press("Tab");
    const addTag = page.getByRole("button", { name: "+ 태그 추가" });
    await expect(addTag).toBeFocused();
    expect(await addTag.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none");

    await body(page).click();
    await toolbar(page).getByRole("button", { name: "링크", exact: true }).click();
    const dialog = await linkDialog(page);
    const cancel = dialog.getByRole("button", { name: "취소" });
    await dialog.getByRole("switch").focus();
    await page.keyboard.press("Tab");
    await expect(cancel).toBeFocused();
    expect(await drawsOutline(cancel)).toBe(true);
  });

  test("아래쪽 줄을 선택하면 버블은 전처럼 선택 위에 뜬다", async ({ page }) => {
    await openEditor(page);
    await body(page).click();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.type(`${i + 1}번째 줄`);
      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");
    }
    await selectLine(page, "여섯째 줄에서 고른 글자");
    const floating = await box(bubble(page));
    const line = await box(body(page).locator("p").last());
    expect(floating.y + floating.height).toBeLessThanOrEqual(line.y + 1);
  });

  test("툴바의 링크 창은 주소 칸에서 시작하고, 포커스는 창 안에 머문다", async ({ page }) => {
    await openEditor(page);
    await body(page).click();
    await page.keyboard.type("링크 앞 ");
    await toolbar(page).getByRole("button", { name: "링크", exact: true }).click();
    await expect(address(page)).toBeFocused();
    expect(await drawsOutline(address(page))).toBe(false);

    const dialog = page.getByRole("dialog", { name: LINK_DIALOG });
    for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await address(page).focus();
    await page.keyboard.type("example.com/a");
    await page.keyboard.press("Enter");
    await expect(body(page).locator('a[href="https://example.com/a"]')).toBeVisible();
  });

  test("카드 창도 주소 칸에서 시작한다", async ({ page }) => {
    await openEditor(page);
    await body(page).click();
    await toolbar(page).getByRole("button", { name: "링크 카드·동영상", exact: true }).click();
    await expect(address(page)).toBeFocused();
  });

  test("글자를 고르고 연 링크 창도 주소 칸에서 시작한다", async ({ page }) => {
    await openEditor(page);
    await body(page).click();
    await selectLine(page, "고른 글자");
    await bubble(page).getByRole("button", { name: "링크" }).click();
    await expect(address(page)).toBeFocused();
    await page.keyboard.type("kurl.me/guide");
    await page.keyboard.press("Enter");
    await expect(body(page).getByRole("link", { name: "고른 글자", exact: true })).toHaveAttribute("href", "https://kurl.me/guide");
  });

  test("링크로 끝나는 줄 끝에 이어 쓴 글자는 링크에 붙지 않는다", async ({ page }) => {
    await openEditor(page);
    await body(page).click();
    await page.keyboard.type("앞 [링크](https://example.com)");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("다음 문단");
    await frames(page);
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("End");
    await page.keyboard.type("뒤글자");
    await expect(body(page).locator("p").first()).toHaveText("앞 링크뒤글자");
    await expect(body(page).locator('a[href="https://example.com"]')).toHaveText("링크");
  });

  test("고른 글자에 링크를 걸고 이어 쓴 글자는 링크에 붙지 않는다", async ({ page }) => {
    await openEditor(page);
    await body(page).click();
    await selectLine(page, "고른 글자");
    await bubble(page).getByRole("button", { name: "링크" }).click();
    await linkDialog(page);
    await address(page).fill("https://kurl.me/guide");
    await address(page).press("Enter");
    const applied = body(page).locator('a[href="https://kurl.me/guide"]');
    await expect(applied).toHaveText("고른 글자");
    await expect(body(page)).toBeFocused();
    await frames(page);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.type(" 이어 씀");
    await expect(body(page).locator("p").first()).toHaveText("고른 글자 이어 씀");
    await expect(applied).toHaveText("고른 글자");
  });

  test("전부 지운 빈 문서에는 서식 버블이 남지 않는다", async ({ page }) => {
    await openEditor(page);
    await clearAll(page);
    await page.waitForTimeout(600);
    await expect(bubble(page)).toHaveCount(0);
  });

  test("전부 지운 뒤에도 굵게가 바로 켜진다", async ({ page }) => {
    await openEditor(page);
    await clearAll(page);
    await toolbar(page).getByRole("button", { name: "굵게", exact: true }).click();
    await page.keyboard.type("abc");
    await expect(body(page).locator("strong")).toHaveText("abc");
  });

  test("전부 지운 뒤에 붙여 넣은 주소가 그대로 들어간다", async ({ page }) => {
    await openEditor(page);
    await clearAll(page);
    await paste(page, "https://kurl.me/about");
    await expect(body(page).getByRole("link", { name: "https://kurl.me/about" })).toBeVisible();
  });

  test("고른 구분선은 테두리로 보인다", async ({ page }) => {
    await openEditor(page);
    await body(page).click();
    await page.keyboard.type("위");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("---");
    await page.keyboard.type("아래");
    await frames(page);
    await page.keyboard.press("ArrowUp");
    const rule = body(page).locator("hr.ProseMirror-selectednode");
    await expect(rule).toHaveCount(1);
    expect(await drawsOutline(rule)).toBe(true);
    await expect(bubble(page)).toHaveCount(0);
  });

  test("고른 사진은 테두리로 보인다", async ({ page }) => {
    await openEditor(page);
    await body(page).click();
    await page.keyboard.type("사진 위");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    const figure = await insertAndSelectPhoto(page);
    expect(await drawsOutline(figure.locator("img"))).toBe(true);
  });

  test("맨 위에 놓인 사진을 골라도 사진 버블이 툴바를 가리지 않는다", async ({ page }) => {
    await openEditor(page);
    await body(page).click();
    await insertAndSelectPhoto(page);
    const floating = page.getByTestId("image-bubble");
    await expect(floating).toBeVisible();
    await frames(page);
    const bar = await box(toolbar(page));
    expect((await box(floating)).y).toBeGreaterThanOrEqual(bar.y + bar.height);
  });

  test("줄임말로 연 코드 블록도 언어 고르기에 제 이름이 보인다", async ({ page }) => {
    await openEditor(page);
    await body(page).click();
    await page.keyboard.type("```js");
    await page.keyboard.press("Enter");
    const picker = body(page).locator(".cm-codeblock select");
    await expect(picker).toBeVisible();
    await expect
      .poll(() => picker.evaluate((el: HTMLSelectElement) => el.selectedOptions[0]?.textContent ?? ""))
      .toBe("javascript");
  });

  test("제목이 없다는 발행 오류는 제목을 쓰는 순간 사라진다", async ({ page }) => {
    await openEditor(page);
    await body(page).click();
    await page.keyboard.type("본문만 있는 글");
    await page.getByRole("button", { name: "발행", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: /발행 설정/ });
    await dialog.getByPlaceholder("태그 입력 후 Enter").fill("일상");
    await page.keyboard.press("Enter");
    await dialog.getByRole("button", { name: "발행", exact: true }).click();
    await expect(dialog.getByText(TITLE_MISSING)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    await page.getByPlaceholder("제목").click();
    await page.keyboard.type("이제 제목이 있다");
    await expect(page.getByText(TITLE_MISSING)).toHaveCount(0, { timeout: 1_500 });
    await page.getByRole("button", { name: "발행", exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(TITLE_MISSING)).toHaveCount(0, { timeout: 1_500 });
  });
});

test.describe("phone: 편집기 머리", () => {
  test.use(PHONE);

  const headerOf = (page: Page) => page.locator("main textarea").first().locator("xpath=../div[1]");

  async function expectOneRow(page: Page, state: string) {
    const header = headerOf(page);
    await expect(header).toBeVisible();
    const shape = await header.evaluate((bar) => {
      const controls = [...bar.querySelectorAll<HTMLElement>("a, button")].map((el) => el.getBoundingClientRect());
      const clipped = [...bar.querySelectorAll<HTMLElement>("*")].filter((el) => {
        const style = getComputedStyle(el);
        return style.position !== "absolute" && style.overflowX === "hidden" && el.scrollWidth > el.clientWidth + 1;
      }).length;
      return {
        left: Math.min(...controls.map((r) => r.left)),
        right: Math.max(...controls.map((r) => r.right)),
        tallest: Math.max(...controls.map((r) => r.height)),
        clipped,
        edge: bar.getBoundingClientRect().right,
      };
    });
    expect(shape.left, `${state}: 왼쪽 밖으로 나간 버튼`).toBeGreaterThanOrEqual(0);
    expect(shape.right, `${state}: 오른쪽 밖으로 나간 버튼`).toBeLessThanOrEqual(shape.edge + 0.5);
    expect(shape.tallest, `${state}: 두 줄로 접힌 버튼`).toBeLessThanOrEqual(34);
    expect(shape.clipped, `${state}: 잘린 글자`).toBe(0);
  }

  for (const [locale, saved] of [
    ["ko", "저장됨"],
    ["en", "Saved"],
    ["ja", "保存しました"],
  ] as const) {
    for (const [id, state] of [
      ["7001", "발행됨"],
      ["7003", "예약"],
      ["7004", "내려짐"],
    ] as const) {
      test(`${locale}: ${state} 글의 머리는 한 줄에 다 들어간다`, async ({ page }) => {
        await openEditor(page, `/${locale}/blog/write/${id}`);
        await expectOneRow(page, state);
      });
    }

    test(`${locale}: 임시저장 글의 머리는 저장 전·직후·뒤 모두 한 줄에 다 들어간다`, async ({ page }) => {
      await openEditor(page, `/${locale}/blog/write/7002`);
      await expectOneRow(page, "저장 전");
      await body(page).click();
      await page.keyboard.type(" x");
      const status = headerOf(page).locator("[aria-live]");
      await expect(status).toContainText(saved, { timeout: 15_000 });
      await expectOneRow(page, "저장 직후");
      await expect(status).toContainText(/\d{2}:\d{2}/, { timeout: 15_000 });
      await expectOneRow(page, "저장 뒤");
    });
  }
});

test.describe("phone: 노트 쓰는 칸", () => {
  test.use({ ...PHONE, locale: "ko-KR" });

  const fitsItsLabel = (select: Locator) =>
    select.evaluate((el: HTMLSelectElement) => {
      const style = getComputedStyle(el);
      const ruler = document.createElement("canvas").getContext("2d")!;
      ruler.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const needed = ruler.measureText(el.selectedOptions[0]?.textContent ?? "").width;
      const room = el.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      return room >= needed - 1;
    });

  const noSidewaysScroll = (page: Page) =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

  async function scheduleRow(scope: Locator) {
    await scope.getByRole("button", { name: "예약", exact: true }).click();
    const picker = scope.locator('input[type="datetime-local"]');
    await expect(picker).toBeVisible();
    return {
      remove: await box(scope.getByRole("button", { name: "예약 해제" })),
      label: await box(scope.getByText("올릴 때", { exact: true })),
      picker: await box(picker),
    };
  }

  async function openNoteDialog(page: Page) {
    await openHome(page);
    await page.locator('[data-compose-trigger="mobile"]').click();
    await page.getByRole("dialog", { name: "글쓰기" }).getByRole("button", { name: "노트", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "새 노트" });
    await expect(dialog.getByRole("textbox").first()).toBeFocused();
    await page.keyboard.type("창에서 쓰는 노트");
    return dialog;
  }

  test("올릴 곳과 공개 범위가 잘리지 않고 다 읽힌다", async ({ page }) => {
    const note = await openHome(page);
    await note.click();
    await page.keyboard.type("읽히는지 볼 노트");
    const destination = page.locator("[data-note-destination]");
    await expect(destination).toBeVisible();
    expect(await fitsItsLabel(destination)).toBe(true);
    expect(await fitsItsLabel(page.getByLabel("공개 범위").first())).toBe(true);
    const submit = await box(page.getByRole("button", { name: "올리기", exact: true }));
    expect(submit.x + submit.width).toBeLessThanOrEqual(390);
  });

  test("예약을 켜도 화면이 옆으로 밀리지 않는다", async ({ page }) => {
    const note = await openHome(page);
    await note.click();
    await page.keyboard.type("예약할 노트");
    const row = await scheduleRow(page.locator("main"));
    expect(await noSidewaysScroll(page)).toBe(true);
    expect(row.remove.x + row.remove.width).toBeLessThanOrEqual(390);
    expect(row.picker.x + row.picker.width).toBeLessThanOrEqual(390);
    expect(row.label.height).toBeLessThanOrEqual(24);
  });

  test("새 노트 창에서도 올릴 곳과 공개 범위가 다 읽힌다", async ({ page }) => {
    const dialog = await openNoteDialog(page);
    const destination = dialog.locator("[data-note-destination]");
    await expect(destination).toBeVisible();
    expect(await fitsItsLabel(destination)).toBe(true);
    expect(await fitsItsLabel(dialog.getByLabel("공개 범위"))).toBe(true);
  });

  test("새 노트 창에서 예약을 켜도 창 밖으로 나가지 않는다", async ({ page }) => {
    const dialog = await openNoteDialog(page);
    const row = await scheduleRow(dialog);
    const panel = await box(dialog);
    expect(row.remove.x + row.remove.width).toBeLessThanOrEqual(panel.x + panel.width);
    expect(row.picker.x + row.picker.width).toBeLessThanOrEqual(panel.x + panel.width);
    expect(row.label.height).toBeLessThanOrEqual(24);
    expect(await noSidewaysScroll(page)).toBe(true);
  });
});
