import { expect, test, type Locator, type Page } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

const CODE = "pickE2e";

const destination = (id: number, url: string) => ({
  id, url, weight: 50, label: null, enabled: true, countryCode: null, deviceClass: null, os: null, createdAt: "2026-11-01T00:00:00Z",
});

async function open(page: Page, width: number, theme: "light" | "dark" = "light") {
  await page.setViewportSize({ width, height: 900 });
  await page.context().addCookies([{ name: "kurl_theme", value: theme, domain: "localhost", path: "/" }]);
  await signIn(page);
  await mockBackend(page, {
    [`GET /api/v1/links/${CODE}/destinations`]: (route) =>
      route.fulfill({ json: [destination(1, "https://a.example.com"), destination(2, "https://b.example.com")] }),
  });
  await page.goto(`/ko/stats/${CODE}#settings`);
  await expect(page.getByLabel("대상 기기")).toHaveCount(3);
}

function contrast(el: Locator, ink: "color" | "accentColor" = "color") {
  return el.evaluate((node, ink) => {
    const style = getComputedStyle(node);
    const ground = getComputedStyle(node.closest("section")!).backgroundColor;
    const channels = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const luminance = (value: string) => {
      const [r, g, b] = channels(value).map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const back = ink === "color" ? style.backgroundColor : ground;
    const [hi, lo] = [luminance(style[ink]), luminance(back)].sort((a, b) => b - a);
    return (hi + 0.05) / (lo + 0.05);
  }, ink);
}

const height = async (el: Locator) => Math.round((await el.boundingBox())!.height);
const width = async (el: Locator) => Math.round((await el.boundingBox())!.width);

test("in dark mode the device and OS pickers read on their own background, in the add form and in each row", async ({ page }) => {
  await open(page, 1440, "dark");
  for (const label of ["대상 기기", "대상 OS"]) {
    const pickers = page.getByLabel(label);
    for (const picker of await pickers.all()) {
      expect(await contrast(picker)).toBeGreaterThan(4.5);
    }
  }
});

test("in dark mode each row's weight slider shows on the card", async ({ page }) => {
  await open(page, 1440, "dark");
  const sliders = page.locator('input[type="range"]');
  await expect(sliders).toHaveCount(2);
  for (const slider of await sliders.all()) {
    expect(await contrast(slider, "accentColor")).toBeGreaterThan(3);
  }
});

test("on the phone the add form's three pickers are full-width rows of one height with 16px text", async ({ page }) => {
  await open(page, 390);
  const pickers = [page.getByLabel("대상 국가").first(), page.getByLabel("대상 기기").first(), page.getByLabel("대상 OS").first()];
  const url = page.getByPlaceholder("https://variant-a.example.com");
  const heights = await Promise.all(pickers.map(height));
  expect(new Set(heights).size).toBe(1);
  expect(heights[0]).toBe(await height(url));
  for (const picker of pickers) {
    expect(await picker.evaluate((node) => getComputedStyle(node).fontSize)).toBe("16px");
    expect(await width(picker)).toBe(await width(url));
  }
});

test("on desktop the pickers in the add form and in a row line up with the buttons beside them", async ({ page }) => {
  await open(page, 1440);
  const add = page.getByRole("button", { name: "추가", exact: true });
  const form = [page.getByLabel("대상 국가").first(), page.getByLabel("대상 기기").first(), page.getByLabel("대상 OS").first()];
  for (const picker of form) expect(await height(picker)).toBe(await height(add));
  const row = [page.getByLabel("대상 국가").nth(1), page.getByLabel("대상 기기").nth(1), page.getByLabel("대상 OS").nth(1)];
  const rowHeights = await Promise.all(row.map(height));
  expect(new Set(rowHeights).size).toBe(1);
});
