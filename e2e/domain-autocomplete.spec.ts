import { expect, test, type Page } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

const SERVERS = ["mastodon.social", "mastodon.online", "misskey.io", "mstdn.jp"];

function account(acct: string) {
  const [username, domain] = acct.split("@");
  return {
    id: 9900,
    acct,
    username,
    domain,
    displayName: username,
    avatarUrl: null,
    url: `https://${domain}/@${username}`,
    following: false,
    requested: false,
  };
}

async function serve(page: Page, { signedIn = true } = {}) {
  const resolved: string[] = [];
  if (signedIn) await signIn(page);
  await mockBackend(page, {
    "GET /api/v1/public/posts": (route) => route.fulfill({ json: { items: [], page: 0, size: 6, hasNext: false } }),
    "GET /api/v1/federation/domains": (route) => {
      const prefix = new URL(route.request().url()).searchParams.get("prefix") ?? "";
      return route.fulfill({ json: { items: SERVERS.filter((d) => d.startsWith(prefix)).map((domain) => ({ domain })) } });
    },
    "GET /api/v1/federation/resolve": (route) => {
      const q = new URL(route.request().url()).searchParams.get("q") ?? "";
      resolved.push(q);
      return route.fulfill({ json: { account: account(q.replace(/^@/, "")), note: null } });
    },
  });
  return resolved;
}

async function openSheet(page: Page) {
  await page.goto("/ko/blog");
  await page.locator("nav.vt-bottom-nav").getByRole("button", { name: "검색" }).click({ timeout: 30_000 });
  const sheet = page.getByRole("dialog", { name: "검색" });
  return { sheet, box: sheet.getByRole("searchbox", { name: "검색" }) };
}

test.describe("phone search sheet", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a server that only looks finished waits for a pick, and the pick asks that server", async ({ page }) => {
    const resolved = await serve(page);
    const { sheet, box } = await openSheet(page);
    await box.fill("@alice@mastodon.so");
    const rows = sheet.getByTestId("domain-completions").getByRole("button");
    await expect(rows).toHaveText(["@alice@mastodon.social"]);
    await expect(rows.locator("svg")).toHaveCount(0);
    await expect(sheet.getByText("검색 결과가 없어요")).toHaveCount(0);
    await page.waitForTimeout(1200);
    expect(resolved).toEqual([]);

    await rows.first().click();
    await expect(box).toHaveValue("@alice@mastodon.social");
    await expect(box).toBeFocused();
    await expect(sheet.getByTestId("domain-completions")).toHaveCount(0);
    await expect(sheet.getByTestId("live-remote-people").getByRole("link", { name: /@alice@mastodon\.social/ })).toBeVisible({
      timeout: 10_000,
    });
    expect(resolved).toEqual(["@alice@mastodon.social"]);
  });

  test("a whole handle typed out goes straight to its server, with no rows", async ({ page }) => {
    const resolved = await serve(page);
    const { sheet, box } = await openSheet(page);
    await box.fill("＠alice＠mstdn.jp");
    await expect(sheet.getByTestId("live-remote-people").getByRole("link", { name: /@alice@mstdn\.jp/ })).toBeVisible({
      timeout: 10_000,
    });
    await expect(sheet.getByTestId("domain-completions")).toHaveCount(0);
    expect(resolved).toEqual(["@alice@mstdn.jp"]);
  });

  test("a server part no known server starts with still says nothing was found", async ({ page }) => {
    const resolved = await serve(page);
    const { sheet, box } = await openSheet(page);
    await box.fill("@alice@zzz");
    await expect(sheet.getByText("검색 결과가 없어요")).toBeVisible({ timeout: 10_000 });
    await expect(sheet.getByTestId("domain-completions")).toHaveCount(0);
    expect(resolved).toEqual([]);
  });

  test("the arrow keys reach the rows from the field and Enter picks", async ({ page }) => {
    await serve(page);
    const { sheet, box } = await openSheet(page);
    await box.fill("@alice@m");
    const rows = sheet.getByTestId("domain-completions").getByRole("button");
    await expect(rows).toHaveCount(4);
    await box.press("ArrowDown");
    await expect(rows.nth(0)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(rows.nth(1)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(box).toHaveValue("@alice@mastodon.online");
  });

  test("signed out, rows still fill the handle but nothing asks the server", async ({ page }) => {
    const resolved = await serve(page, { signedIn: false });
    const { sheet, box } = await openSheet(page);
    await box.fill("@alice@mis");
    await sheet.getByTestId("domain-completions").getByRole("button", { name: "@alice@misskey.io" }).click();
    await expect(box).toHaveValue("@alice@misskey.io");
    await page.waitForTimeout(1200);
    expect(resolved).toEqual([]);
  });
});

test("the header offers the servers it knows best after the second @, and the keyboard picks one", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serve(page);
  await page.goto("/ko/blog");
  const field = page.locator("header").getByRole("searchbox", { name: "검색" });
  await field.fill("@gargron@", { timeout: 30_000 });
  const rows = page.getByRole("search").getByTestId("domain-completions").getByRole("button");
  await expect(rows).toHaveText(SERVERS.map((d) => `@gargron@${d}`));
  await field.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(field).toHaveValue("@gargron@misskey.io");
});
