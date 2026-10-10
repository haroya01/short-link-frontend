import { expect, test, type Page } from "@playwright/test";
import { expectOnTop, toastBy } from "./helpers/on-top";

// mock-on 레인. 브라우저의 기기 안 번역기(Translator·LanguageDetector)를 가짜로 심는다. 번역은 iOS 의
// EchoTranslator 처럼 "[대상 언어] "를 붙이고, 언어 판정은 한글·가나로 가른다. e2e:translator-download 가
// 있으면 모델을 내려받는 척하고, e2e:translator-fail 이 있으면 번역기를 만들지 못한다.
async function fakeTranslator(page: Page) {
  await page.addInitScript(() => {
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    Object.assign(window, {
      Translator: {
        availability: async ({ sourceLanguage, targetLanguage }: { sourceLanguage: string; targetLanguage: string }) =>
          sourceLanguage === targetLanguage
            ? "unavailable"
            : localStorage.getItem("e2e:translator-download")
              ? "downloadable"
              : "available",
        create: async ({ targetLanguage, monitor }: { targetLanguage: string; monitor?: (m: EventTarget) => void }) => {
          const events = new EventTarget();
          monitor?.(events);
          if (localStorage.getItem("e2e:translator-download")) {
            for (const loaded of [0, 0.4, 1]) {
              await wait(400);
              events.dispatchEvent(new ProgressEvent("downloadprogress", { loaded, total: 1 }));
            }
          }
          if (localStorage.getItem("e2e:translator-fail")) throw new Error("NotAllowedError");
          return { translate: async (text: string) => `[${targetLanguage}] ${text}` };
        },
      },
      LanguageDetector: {
        availability: async () => "available",
        create: async () => ({
          detect: async (text: string) => [
            { detectedLanguage: /[가-힣]/.test(text) ? "ko" : /[぀-ヿ]/.test(text) ? "ja" : "en", confidence: 0.95 },
          ],
        }),
      },
    });
  });
}

test.use({ viewport: { width: 1280, height: 900 }, locale: "ko-KR" });

// 권유는 비동기 판정 뒤에 뜬다. "없음"은 첫 화면이 아니라 그 판정보다 오래 버텨야 한다.
async function expectNoOffer(page: Page) {
  await page.waitForTimeout(1_500);
  await expect(page.locator("[data-translate-line]")).toHaveCount(0);
}

const ENGLISH_NOTE = "/ko/blog/remote/9800/notes/12";

test("an English note offers 번역 보기 under its body, swaps in place keeping the tag, and comes back", async ({ page }) => {
  await fakeTranslator(page);
  await page.goto(ENGLISH_NOTE);
  const note = page.locator('article[data-note-id="12"]');
  const translate = note.getByRole("button", { name: "번역 보기" });
  await translate.click({ timeout: 30_000 });

  await expect(note.locator("[data-note-body] p").first()).toHaveText("[ko] Hello from the fediverse 👋 #kurl");
  await expect(note.getByRole("link", { name: "#kurl" })).toBeVisible();
  await expect(note.locator("[data-translate-line]")).toContainText("영어에서 번역됨");
  await expect(page.getByText("번역문을 보여 줘요")).toBeAttached();

  await note.getByRole("button", { name: "원문 보기" }).click();
  await expect(note.locator("[data-note-body] p").first()).toHaveText("Hello from the fediverse 👋 #kurl");
  await expect(page.getByText("원문을 보여 줘요")).toBeAttached();
  await expect(translate).toBeFocused();

  await translate.click();
  await expect(note.locator("[data-note-body] p").first()).toHaveText("[ko] Hello from the fediverse 👋 #kurl");
});

test("a note in the reader's language offers nothing", async ({ page }) => {
  await fakeTranslator(page);
  await page.goto("/ko/p/haruka/notes/11");
  await expect(page.locator('article[data-note-id="11"]')).toContainText("포트와 어댑터", { timeout: 30_000 });
  await expectNoOffer(page);
});

test.describe("a reader whose browser also reads English", () => {
  test.use({ locale: "en-US" });

  test("isn't offered a translation of an English note on the Korean page", async ({ page }) => {
    await fakeTranslator(page);
    await page.goto(ENGLISH_NOTE);
    await expect(page.locator('article[data-note-id="12"]')).toContainText("Hello from the fediverse", { timeout: 30_000 });
    await expectNoOffer(page);
  });
});

async function selectInFirstParagraph(page: Page, scope: "[data-translation]" | ":not([hidden])") {
  await page.evaluate((scope) => {
    const block = document.querySelector(`.prose-post > p${scope}`)!;
    const text = Array.from(block.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim())!;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, Math.min(8, text.textContent!.length));
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  }, scope);
}

test("without an on-device translator there is no control at all", async ({ page }) => {
  await page.goto(ENGLISH_NOTE);
  await expect(page.locator('article[data-note-id="12"]')).toContainText("Hello from the fediverse", { timeout: 30_000 });
  await expectNoOffer(page);
});

test.describe("a Japanese reader on a Korean post", () => {
  test.use({ locale: "ja-JP" });
  const POST = "/ja/p/sora/posthog-funnel";
  const line = (page: Page) => page.locator("article header [data-translate-line]");

  test("the line under the author row translates the post in place, and highlights wait for the original", async ({
    page,
  }) => {
    await fakeTranslator(page);
    await page.goto(POST);
    await expect(line(page)).toContainText("韓国語で書かれた記事です", { timeout: 30_000 });
    const marks = page.locator(".prose-post mark[data-hl-id]");
    await expect(marks.first()).toBeVisible();

    await line(page).getByRole("button", { name: "翻訳する" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("[ja] PostHog로 퍼널 분석 붙이기");
    await expect(line(page)).toContainText("韓国語から翻訳");
    await expect(page.getByRole("heading", { name: "[ja] 배경" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "[ja] p95 응답" })).toBeVisible();
    await expect(page.locator(".prose-post pre").first()).toContainText("function add(a: number, b: number)");
    await expect(page.locator(".prose-post pre").first()).not.toContainText("[ja]");
    await expect(marks).toHaveCount(0);
    await selectInFirstParagraph(page, "[data-translation]");
    await page.waitForTimeout(300);
    await expect(page.getByRole("toolbar")).toHaveCount(0);

    await line(page).getByRole("button", { name: "原文を表示" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("PostHog로 퍼널 분석 붙이기");
    await expect(page.locator(".prose-post [data-translation]")).toHaveCount(0);
    await expect(marks.first()).toBeVisible();
    await selectInFirstParagraph(page, ":not([hidden])");
    await expect(page.getByRole("toolbar")).toBeVisible();
  });

  test("a first-time language pack shows its download as a progress bar before the translation", async ({ page }) => {
    await fakeTranslator(page);
    await page.addInitScript(() => localStorage.setItem("e2e:translator-download", "1"));
    await page.goto(POST);
    await line(page).getByRole("button", { name: "翻訳する" }).click({ timeout: 30_000 });
    await expect(line(page)).toContainText("翻訳中…");
    await expect(line(page).getByRole("progressbar")).toHaveAttribute("aria-valuenow", /^(0|20|50)$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("[ja] PostHog로 퍼널 분석 붙이기", {
      timeout: 10_000,
    });
  });

  test("a failed translation says so and keeps the original", async ({ page }) => {
    await fakeTranslator(page);
    await page.addInitScript(() => localStorage.setItem("e2e:translator-fail", "1"));
    await page.goto(POST);
    await line(page).getByRole("button", { name: "翻訳する" }).click({ timeout: 30_000 });
    await expectOnTop(toastBy(page, "翻訳できませんでした"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("PostHog로 퍼널 분석 붙이기");
    await expect(line(page).getByRole("button", { name: "翻訳する" })).toBeVisible();
  });
});
