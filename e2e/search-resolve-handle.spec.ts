import { expect, test, type Page, type Route } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

const GARGRON = {
  id: 9900,
  acct: "Gargron@mastodon.social",
  username: "Gargron",
  domain: "mastodon.social",
  displayName: "Eugen Rochko",
  avatarUrl: null,
  url: "https://mastodon.social/@Gargron",
  following: false,
  requested: false,
};

test.use({ viewport: { width: 390, height: 844 } });

function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => (open = resolve));
  return { opened, open };
}

async function serveResolve(page: Page, answer: (q: string, route: Route) => Promise<void>) {
  const asked: string[] = [];
  await signIn(page);
  await mockBackend(page, {
    "GET /api/v1/public/posts": (route) => route.fulfill({ json: { items: [], page: 0, size: 6, hasNext: false } }),
    "GET /api/v1/federation/resolve": async (route) => {
      const q = new URL(route.request().url()).searchParams.get("q") ?? "";
      asked.push(q);
      await answer(q, route).catch(() => undefined);
    },
  });
  return asked;
}

async function openSheet(page: Page) {
  await page.goto("/ko/blog/explore");
  const sheet = page.locator("main");
  const box = sheet.getByRole("searchbox", { name: "검색" });
  await expect(box).toBeVisible({ timeout: 30_000 });
  return { sheet, box };
}

test("a handle typed into the sheet is asked of its server once, and the account appears under 다른 서버", async ({
  page,
}) => {
  const reply = gate();
  const asked = await serveResolve(page, async (_q, route) => {
    await reply.opened;
    await route.fulfill({ json: { account: GARGRON, note: null } });
  });
  const { sheet, box } = await openSheet(page);
  await box.pressSequentially("＠Gargron＠mastodon.social", { delay: 30 });

  const group = sheet.getByTestId("live-remote-people");
  await expect(group.getByRole("heading", { name: "다른 서버" })).toBeVisible();
  await expect(group.getByRole("status")).toHaveText("그 서버에 묻는 중…");
  await expect(group.locator("svg")).toHaveCount(0);
  await expect(sheet.getByText("검색 결과가 없어요")).toHaveCount(0);
  reply.open();

  await expect(group.getByRole("link", { name: /@Gargron@mastodon\.social/ })).toHaveAttribute("href", /\/remote\/9900$/);
  await expect(group.getByRole("status")).toHaveCount(0);
  expect(asked).toEqual(["@Gargron@mastodon.social"]);
});

test("a server name still being typed is not asked about", async ({ page }) => {
  const asked = await serveResolve(page, (_q, route) => route.fulfill({ json: { account: GARGRON, note: null } }));
  const { sheet, box } = await openSheet(page);
  await box.fill("@a@mastodon.s");
  await page.waitForTimeout(1200);
  expect(asked).toEqual([]);
  await expect(sheet.getByTestId("live-remote-people")).toHaveCount(0);
});

test("a query changed mid-question drops the old question and leaves no stale error behind", async ({ page }) => {
  const late = gate();
  const aborted: string[] = [];
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith("/federation/resolve")) aborted.push(url.searchParams.get("q") ?? "");
  });
  const asked = await serveResolve(page, async (q, route) => {
    if (q === "@nobody@mastodon.social") {
      await late.opened;
      await route.fulfill({ status: 404, json: { status: 404, code: "REMOTE_ACCOUNT_NOT_FOUND" } });
      return;
    }
    await route.fulfill({ json: { account: GARGRON, note: null } });
  });
  const { sheet, box } = await openSheet(page);
  const group = sheet.getByTestId("live-remote-people");

  await box.fill("@nobody@mastodon.social");
  await expect(group.getByRole("status")).toHaveText("그 서버에 묻는 중…");
  await box.fill("@Gargron@mastodon.social");
  await expect.poll(() => aborted).toEqual(["@nobody@mastodon.social"]);
  late.open();

  await expect(group.getByRole("link", { name: /@Gargron@mastodon\.social/ })).toBeVisible();
  await page.waitForTimeout(300);
  await expect(sheet.getByText("mastodon.social 서버에서 찾지 못했어요")).toHaveCount(0);
  expect(asked).toEqual(["@nobody@mastodon.social", "@Gargron@mastodon.social"]);
});

test.describe("desktop header search", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("shows the account a handle names, with one hairline between it and the link to every result", async ({ page }) => {
    const asked = await serveResolve(page, (_q, route) => route.fulfill({ json: { account: GARGRON, note: null } }));
    await page.goto("/ko/blog");
    await page.locator("header").getByRole("searchbox", { name: "검색" }).fill("acct:@Gargron@mastodon.social", { timeout: 30_000 });
    const search = page.getByRole("search");
    const group = search.getByTestId("live-remote-people");
    await expect(group.getByRole("link", { name: /@Gargron@mastodon\.social/ })).toHaveAttribute("href", /\/remote\/9900$/);
    expect(asked).toEqual(["@Gargron@mastodon.social"]);

    const footer = search.getByRole("button", { name: "‘acct:@Gargron@mastodon.social’ 검색 결과" }).locator("..");
    const groupBox = (await group.boundingBox())!;
    const footerBox = (await footer.boundingBox())!;
    expect(footerBox.y).toBeCloseTo(groupBox.y + groupBox.height - 1, 0);
  });
});
