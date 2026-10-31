import { expect, test, type Page } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

const SCREENS = [
  "/ko/dashboard",
  "/ko/stats/e2eStat",
  "/ko/analytics",
  "/ko/campaigns",
  "/ko/events",
  "/ko/events/new",
  "/ko/more",
  "/ko/settings",
  "/ko/ctas",
];

async function titleLeft(page: Page, path: string) {
  await page.goto(path);
  const title = page.locator("main h1").first();
  await expect(title).toBeVisible();
  return Math.round((await title.boundingBox())!.x);
}

async function countViewTransitions(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __vt: number };
    w.__vt = 0;
    const original = document.startViewTransition?.bind(document);
    if (!original) return;
    document.startViewTransition = ((cb: () => void) => {
      w.__vt += 1;
      return original(cb);
    }) as typeof document.startViewTransition;
  });
  return () => page.evaluate(() => (window as unknown as { __vt: number }).__vt);
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  test(`every signed-in links screen starts its title on the same line (${name})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await signIn(page);
    await mockBackend(page);
    const lefts: Record<string, number> = {};
    for (const path of SCREENS) lefts[path] = await titleLeft(page, path);
    const line = lefts["/ko/dashboard"];
    expect(lefts).toEqual(Object.fromEntries(SCREENS.map((path) => [path, line])));
  });
}

test("the desktop header moves between tabs with a view transition and keeps the title line", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  await mockBackend(page);
  const transitions = await countViewTransitions(page);
  await page.goto("/ko/dashboard");
  const before = await page.locator("main h1").first().boundingBox();

  await page.locator("header nav:visible").getByRole("link", { name: "분석", exact: true }).click();
  await expect(page).toHaveURL(/\/ko\/analytics$/);
  await expect(page.locator("main h1").first()).toHaveText("분석");
  expect(await transitions()).toBe(1);
  expect((await page.locator("main h1").first().boundingBox())!.x).toBe(before!.x);

  await page.locator("header nav:visible").getByRole("link", { name: "분석", exact: true }).click();
  expect(await transitions()).toBe(1);
});

test("the phone tab bar moves between tabs with a view transition", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await mockBackend(page);
  const transitions = await countViewTransitions(page);
  await page.goto("/ko/dashboard");
  const tabBar = page.locator("nav:visible").filter({ has: page.getByRole("link", { name: "분석", exact: true }) });

  await tabBar.getByRole("link", { name: "더보기", exact: true }).click();
  await expect(page).toHaveURL(/\/ko\/more$/);
  await expect(tabBar.getByRole("link", { name: "더보기", exact: true })).toHaveAttribute("aria-current", "page");
  expect(await transitions()).toBe(1);
});

test("the desktop stats header keeps one primary action and moves the rest into a menu", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page);
  await mockBackend(page);
  await page.goto("/ko/stats/e2eStat");
  await expect(page.getByRole("button", { name: "복사", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "링크 설정" })).toHaveCount(0);
  await expect(page.getByRole("switch", { name: "통계 공개" })).toHaveCount(0);

  await page.getByRole("button", { name: "작업 더 보기" }).click();
  const menu = page.getByRole("menu", { name: "작업 더 보기" });
  await expect(menu.getByRole("menuitem")).toHaveText(["QR 코드", "링크 설정", "요약 CSV"]);
  await expect(menu.getByRole("menuitemcheckbox", { name: "통계 공개" })).toHaveAttribute("aria-checked", "false");

  await menu.getByRole("menuitem", { name: "QR 코드" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("더보기 groups its rows under headings that sit outside the card, like a settings list", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await mockBackend(page);
  await page.goto("/ko/more");
  for (const name of ["도구", "앱", "계정"]) {
    const heading = page.getByRole("heading", { level: 2, name, exact: true });
    await expect(heading).toBeVisible();
    const card = heading.locator("xpath=following-sibling::div[1]");
    const [h, c] = [(await heading.boundingBox())!, (await card.boundingBox())!];
    expect(h.y + h.height).toBeLessThanOrEqual(c.y);
    await expect(card.getByRole("link").first()).toBeVisible();
  }
});

test("on a phone the shorten bar and the tab bar read as one sheet: no line between them", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await mockBackend(page);
  await page.goto("/ko/dashboard");
  const bar = page.locator("[data-composer-bar]");
  const nav = page.locator(".vt-bottom-nav");
  await expect(bar).toBeVisible();
  await expect(nav).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
  const [b, n] = [(await bar.boundingBox())!, (await nav.boundingBox())!];
  expect(Math.abs(b.y + b.height - n.y)).toBeLessThanOrEqual(1);
});
