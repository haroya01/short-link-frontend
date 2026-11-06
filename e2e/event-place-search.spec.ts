import { expect, test, type Page } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

const PLACES = [
  { placeId: "ChIJ-shibuya-station", main: "渋谷駅", secondary: "日本、東京都渋谷区道玄坂" },
  { placeId: "ChIJ-shibuya-sky", main: "SHIBUYA SKY", secondary: "日本、東京都渋谷区渋谷2丁目" },
  { placeId: "ChIJ-shibuya-109", main: "SHIBUYA109", secondary: "日本、東京都渋谷区道玄坂2丁目" },
];

async function google(page: Page) {
  const searches: string[] = [];
  const unexpected: string[] = [];
  await page.route(/^https:\/\/(maps\.googleapis\.com|places\.googleapis\.com|www\.google\.com\/maps)\//, (route) => {
    unexpected.push(route.request().url());
    return route.abort();
  });
  await page.route(/^https:\/\/maps\.googleapis\.com\/maps\/api\/js\?/, (route) => route.abort());
  await page.route("https://places.googleapis.com/v1/places:autocomplete", (route) => {
    const { input } = JSON.parse(route.request().postData() ?? "{}") as { input: string };
    searches.push(input);
    return route.fulfill({
      json: {
        suggestions: PLACES.filter((p) => `${p.main} ${p.secondary}`.includes(input)).map((p) => ({
          placePrediction: {
            placeId: p.placeId,
            structuredFormat: { mainText: { text: p.main }, secondaryText: { text: p.secondary } },
          },
        })),
      },
    });
  });
  await page.route(/^https:\/\/www\.google\.com\/maps\/embed\/v1\/place\?/, (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>map</title><body>map</body>" }),
  );
  return { searches, unexpected };
}

async function organizer(page: Page, saved?: Record<string, unknown>) {
  const sent: Record<string, unknown>[] = [];
  const event = {
    id: 1, slug: "e2e-1", title: "장소 모집", descriptionMd: null, coverImageUrl: null, startsAt: "2030-01-15T10:00:00Z",
    endsAt: null, timezone: "Asia/Seoul", locationText: null, locationUrl: null, onlineUrl: null, capacity: null,
    closeAt: null, contactField: "EMAIL", questions: [], status: "OPEN", registrationCount: 0, links: [],
    createdAt: "2026-09-23T00:00:00Z", ...saved,
  };
  await signIn(page);
  await mockBackend(page, {
    "POST /api/v1/events": (route) => {
      sent.push(JSON.parse(route.request().postData() ?? "{}"));
      return route.fulfill({ json: { ...event, ...sent.at(-1) } });
    },
    "GET /api/v1/events/1": (route) => route.fulfill({ json: event }),
    "PATCH /api/v1/events/1": (route) => {
      sent.push(JSON.parse(route.request().postData() ?? "{}"));
      return route.fulfill({ json: { ...event, ...sent.at(-1) } });
    },
  });
  return sent;
}

const place = (page: Page) => page.getByRole("combobox", { name: "장소" });
const options = (page: Page) => page.getByRole("listbox", { name: "장소" }).getByRole("option");
const map = (page: Page) => page.locator('#ef-panel-edit iframe[src*="/maps/embed/v1/place"]');
const previewMap = (page: Page) => page.getByTestId("event-preview").locator('iframe[src*="/maps/embed/v1/place"]');

async function caretToEnd(page: Page) {
  await place(page).evaluate((input: HTMLInputElement) => {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });
}

test.describe("event place search", () => {
  test("search, pick with the keyboard, add a floor after the name and publish", async ({ page }) => {
    const { searches, unexpected } = await google(page);
    const sent = await organizer(page);
    await page.goto("/ko/events/new");
    await expect(page.locator("#ef-starts")).not.toHaveValue("");
    await page.getByLabel("제목", { exact: false }).fill("장소 모집");

    await place(page).fill("渋谷");
    const list = page.getByRole("listbox", { name: "장소" });
    await expect(options(page)).toHaveCount(3);
    await expect(page.getByText("Powered by Google")).toBeVisible();
    await expect(options(page).first()).toHaveAttribute("aria-selected", "true");

    await place(page).press("ArrowDown");
    const second = options(page).filter({ hasText: "SHIBUYA SKY" });
    await expect(second).toHaveAttribute("aria-selected", "true");
    await expect(place(page)).toHaveAttribute("aria-activedescendant", (await second.getAttribute("id"))!);
    await place(page).press("Enter");

    await expect(list).toBeHidden();
    await expect(place(page)).toHaveValue("SHIBUYA SKY");
    await expect(place(page)).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText("日本、東京都渋谷区渋谷2丁目")).toBeVisible();
    await expect(map(page)).toHaveAttribute("src", /q=place_id:ChIJ-shibuya-sky&language=ko/);
    await expect(page.getByRole("button", { name: "링크로 넣기" })).toBeHidden();
    expect(sent).toHaveLength(0);

    const searchesBefore = searches.length;
    await caretToEnd(page);
    await page.keyboard.type(", 3층");
    await expect(place(page)).toHaveValue("SHIBUYA SKY, 3층");
    await page.waitForTimeout(500);
    expect(searches).toHaveLength(searchesBefore);
    await expect(map(page)).toBeVisible();
    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(page.getByTestId("event-preview")).toContainText("SHIBUYA SKY, 3층");
    await expect(previewMap(page)).toHaveAttribute("src", /q=place_id:ChIJ-shibuya-sky&language=ko/);

    await page.getByRole("button", { name: "발행하기" }).click();
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]).toMatchObject({
      locationText: "SHIBUYA SKY, 3층",
      locationUrl: "https://www.google.com/maps/search/?api=1&query=SHIBUYA%20SKY&query_place_id=ChIJ-shibuya-sky",
    });
    expect(unexpected).toEqual([]);
  });

  test("Escape closes the list, and changing the name itself lets go of the place", async ({ page }) => {
    const { unexpected } = await google(page);
    const sent = await organizer(page);
    await page.goto("/ko/events/new");
    await expect(page.locator("#ef-starts")).not.toHaveValue("");
    await page.getByLabel("제목", { exact: false }).fill("장소 모집");

    await place(page).fill("渋谷駅");
    await expect(options(page)).toHaveCount(1);
    await place(page).press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();
    await place(page).press("ArrowDown");
    await expect(options(page)).toHaveCount(1);
    await options(page).filter({ hasText: "渋谷駅" }).click();
    await expect(map(page)).toHaveAttribute("src", /place_id:ChIJ-shibuya-station/);

    await caretToEnd(page);
    await page.keyboard.press("Backspace");
    await expect(place(page)).toHaveValue("渋谷");
    await expect(map(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "장소 지우기" })).toBeHidden();
    await expect(options(page)).toHaveCount(3);
    await place(page).press("Escape");

    await page.getByRole("button", { name: "발행하기" }).click();
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]).toMatchObject({ locationText: "渋谷", locationUrl: null });
    expect(unexpected).toEqual([]);
  });

  test("the clear button lets go of the name, link and map, then a map link from elsewhere goes in by hand", async ({ page }) => {
    const { unexpected } = await google(page);
    const sent = await organizer(page);
    await page.goto("/ko/events/new");
    await expect(page.locator("#ef-starts")).not.toHaveValue("");
    await page.getByLabel("제목", { exact: false }).fill("장소 모집");

    await place(page).fill("渋谷");
    await expect(options(page)).toHaveCount(3);
    await place(page).press("Enter");
    await expect(map(page)).toBeVisible();

    await page.getByRole("button", { name: "장소 지우기" }).click();
    await expect(place(page)).toHaveValue("");
    await expect(place(page)).toBeFocused();
    await expect(map(page)).toHaveCount(0);
    await expect(page.getByText("日本、東京都渋谷区道玄坂", { exact: true })).toBeHidden();

    await page.getByRole("button", { name: "링크로 넣기" }).click();
    const link = page.getByLabel("지도 링크");
    await expect(link).toBeFocused();
    await link.fill("https://naver.me/5kurl");
    await expect(page.getByRole("button", { name: "링크로 넣기" })).toBeHidden();
    await place(page).fill("성수 카페");
    await place(page).press("Escape");

    await page.getByRole("button", { name: "발행하기" }).click();
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]).toMatchObject({ locationText: "성수 카페", locationUrl: "https://naver.me/5kurl" });
    expect(unexpected).toEqual([]);
  });

  test("reopening an event shows its saved place, or its hand-entered link already open", async ({ page }) => {
    const { unexpected } = await google(page);
    await organizer(page, {
      locationText: "渋谷駅, 3층",
      locationUrl: "https://www.google.com/maps/search/?api=1&query=%E6%B8%8B%E8%B0%B7%E9%A7%85&query_place_id=ChIJ-shibuya-station",
    });
    await page.goto("/ko/events/1/edit");
    await expect(place(page)).toHaveValue("渋谷駅, 3층");
    await expect(map(page)).toHaveAttribute("src", /place_id:ChIJ-shibuya-station/);
    await expect(page.getByLabel("지도 링크")).toHaveCount(0);
    await caretToEnd(page);
    await page.keyboard.type("4");
    await expect(map(page)).toBeVisible();
    expect(unexpected).toEqual([]);
  });

  test("the link field stays folded on a new event and opens on one saved with a hand-entered link", async ({ page }) => {
    await google(page);
    await organizer(page, { locationText: "성수 카페", locationUrl: "https://naver.me/5kurl" });
    await page.goto("/ko/events/new");
    await expect(page.locator("#ef-starts")).not.toHaveValue("");
    await expect(page.getByRole("button", { name: "링크로 넣기" })).toBeVisible();
    await expect(page.getByLabel("지도 링크")).toHaveCount(0);

    await page.goto("/ko/events/1/edit");
    await expect(page.getByLabel("지도 링크")).toHaveValue("https://naver.me/5kurl");
    await expect(page.getByRole("button", { name: "링크로 넣기" })).toHaveCount(0);
    await expect(map(page)).toHaveCount(0);
  });
});
