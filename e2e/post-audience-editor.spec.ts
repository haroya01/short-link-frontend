import { test, expect, type Locator, type Page } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

const NOW = "2026-10-16T00:00:00Z";
const POST_ID = 16;
const ME = { id: 1, email: "e2e@kurl.test", role: "USER", createdAt: NOW, username: "e2euser" };
const LINK = "https://blog.kurl.me/@e2euser/night-notes?k=first-key";
const ROTATED = "https://blog.kurl.me/@e2euser/night-notes?k=second-key";

type Wire = {
  patches: Record<string, unknown>[];
  rotations: number;
  revalidations: { postId: unknown; authorization: string | null }[];
};

async function backend(page: Page, wire: Wire) {
  let post: Record<string, unknown> = {
    id: POST_ID,
    slug: "night-notes",
    title: "밤의 기록",
    status: "PUBLISHED",
    languageTag: "ko",
    publishedAt: NOW,
    scheduledAt: null,
    excerpt: "요약",
    ogImageUrl: null,
    viewCount: 3,
    likeCount: 0,
    tags: ["일상"],
    seriesId: null,
    seriesOrder: null,
    pinOrder: null,
    createdAt: NOW,
    updatedAt: NOW,
    contentVersion: 1,
    audience: "PUBLIC",
    hasPassword: false,
    blockedCountries: [],
  };
  await page.route("**/api/v1/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route("**/api/v1/users/me", (route) => route.fulfill({ json: ME }));
  await page.route(`**/api/v1/posts/${POST_ID}`, (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      wire.patches.push(body);
      const audience = (body.audience as string | undefined) ?? post.audience;
      post = {
        ...post,
        ...(body.audience ? { audience: body.audience } : {}),
        ...(body.blockedCountries ? { blockedCountries: body.blockedCountries } : {}),
        ...(body.password ? { hasPassword: true } : {}),
        unlistedUrl: audience === "UNLISTED" ? LINK : null,
      };
    }
    return route.fulfill({ json: post });
  });
  await page.route(`**/api/v1/posts/${POST_ID}/blocks`, (route) =>
    route.fulfill({
      json: [{ id: 1, type: "PARAGRAPH", content: "본문", blockOrder: 0 }],
      headers: { "X-Content-Version": "1", "Access-Control-Expose-Headers": "X-Content-Version" },
    }),
  );
  await page.route(`**/api/v1/posts/${POST_ID}/unlisted-key/rotate`, (route) => {
    wire.rotations += 1;
    post = { ...post, unlistedUrl: ROTATED };
    return route.fulfill({ json: { unlistedUrl: ROTATED } });
  });
  await page.route("**/revalidate", (route) => {
    wire.revalidations.push({
      postId: (route.request().postDataJSON() as { postId?: unknown }).postId,
      authorization: route.request().headers()["authorization"] ?? null,
    });
    return route.fulfill({ status: 204, body: "" });
  });
}

async function openSettings(page: Page): Promise<Locator> {
  await page.context().addInitScript(() => {
    window.localStorage.setItem("short-link:access-token", "e2e-token");
    window.localStorage.setItem("kurl:cookie-consent:v1", "accepted");
  });
  await page.goto(`/ko/blog/write/${POST_ID}`);
  await expect(page.locator(".tiptap")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "글 설정" }).click();
  const dialog = page.getByRole("dialog", { name: "글 설정" });
  await expect(dialog).toBeVisible();
  return dialog;
}

const lastPatch = (wire: Wire) => wire.patches[wire.patches.length - 1] ?? null;

test("the writer picks 팔로워만, the save carries it, and the author's lists are asked to refresh", async ({ page }) => {
  const wire: Wire = { patches: [], rotations: 0, revalidations: [] };
  await backend(page, wire);
  const dialog = await openSettings(page);
  const picker = dialog.getByRole("radiogroup", { name: "공개 범위" });
  await expect(picker.getByRole("radio", { name: "전체" })).toHaveAttribute("aria-checked", "true");
  await picker.getByRole("radio", { name: "팔로워만" }).click();
  await expect(dialog.getByText("제목은 모두에게 보여요")).toBeVisible();
  await dialog.getByRole("button", { name: "변경사항 저장" }).click();
  await expect(dialog).toBeHidden();
  expect(lastPatch(wire)).toMatchObject({ audience: "FOLLOWERS" });
  expect(lastPatch(wire)).not.toHaveProperty("password");
  expect(lastPatch(wire)).not.toHaveProperty("blockedCountries");
  await expect.poll(() => wire.revalidations).toEqual([{ postId: POST_ID, authorization: "Bearer e2e-token" }]);
});

test("비밀번호 holds the save until a password is set, then sends it once", async ({ page }) => {
  const wire: Wire = { patches: [], rotations: 0, revalidations: [] };
  await backend(page, wire);
  const dialog = await openSettings(page);
  await dialog.getByRole("radio", { name: "비밀번호" }).click();
  await dialog.getByRole("button", { name: "변경사항 저장" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("비밀번호를 정하면 저장할 수 있어요.");
  expect(wire.patches).toHaveLength(0);

  await dialog.getByLabel("비밀번호", { exact: true }).fill("open sesame");
  await dialog.getByRole("button", { name: "변경사항 저장" }).click();
  await expect(dialog).toBeHidden();
  expect(lastPatch(wire)).toMatchObject({ audience: "PASSWORD", password: "open sesame" });

  await page.getByRole("button", { name: "글 설정" }).click();
  await expect(page.getByRole("dialog", { name: "글 설정" }).getByLabel("새 비밀번호", { exact: true })).toHaveValue("");
});

test("국가 제한 sends the chosen countries, and an emptied list clears them", async ({ page }) => {
  const wire: Wire = { patches: [], rotations: 0, revalidations: [] };
  await backend(page, wire);
  const dialog = await openSettings(page);
  await dialog.getByRole("button", { name: "대상 국가" }).click();
  const countries = page.getByRole("dialog", { name: "대상 국가" });
  await countries.getByPlaceholder("국가 검색").fill("CN");
  await countries.getByRole("option", { name: /중국/ }).click();
  await expect(countries).toBeHidden();
  await expect(dialog.getByRole("button", { name: "중국 빼기" })).toBeVisible();
  await expect(dialog.getByText("이 나라에서는 제목만 보여요. VPN을 쓰면 막지 못해요.")).toBeVisible();
  await dialog.getByRole("button", { name: "변경사항 저장" }).click();
  await expect(dialog).toBeHidden();
  expect(lastPatch(wire)).toMatchObject({ blockedCountries: ["CN"] });
  expect(lastPatch(wire)).not.toHaveProperty("audience");

  await page.getByRole("button", { name: "글 설정" }).click();
  const again = page.getByRole("dialog", { name: "글 설정" });
  await again.getByRole("button", { name: "중국 빼기" }).click();
  await again.getByRole("button", { name: "변경사항 저장" }).click();
  await expect(again).toBeHidden();
  expect(lastPatch(wire)).toMatchObject({ blockedCountries: [] });
});

test("링크만 keeps the dialog open on its new link, and changing the link asks first", async ({ page }) => {
  const wire: Wire = { patches: [], rotations: 0, revalidations: [] };
  await backend(page, wire);
  const dialog = await openSettings(page);
  await dialog.getByRole("radio", { name: "링크만" }).click();
  await expect(dialog.getByText("목록과 검색에 안 떠요. 링크를 받은 사람은 다시 퍼뜨릴 수 있어요")).toBeVisible();
  await dialog.getByRole("button", { name: "변경사항 저장" }).click();
  const link = dialog.getByRole("textbox", { name: "공유 링크" });
  await expect(link).toHaveValue(LINK);
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "링크 바꾸기" }).click();
  const ask = page.getByRole("dialog", { name: "링크를 바꿀까요?" });
  await expect(ask).toContainText("지금 링크로는 더 이상 열리지 않아요.");
  await ask.getByRole("button", { name: "링크 바꾸기" }).click();
  await expect(link).toHaveValue(ROTATED);
  expect(wire.rotations).toBe(1);
});
