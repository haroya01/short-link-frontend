import { expect, test, type Page, type Route } from "@playwright/test";
import { mockBackend } from "./helpers/mock-backend";

/**
 * 로그인은 URL에 토큰을 싣지 않는다. 주소는 방문 기록·동기화·화면 공유로 새어 나가기 때문이다.
 * 콜백은 HttpOnly 새로 고침 쿠키로 접근 토큰을 받고, 2단계 인증은 구글이면 쿠키, Apple이면 탭 저장소로
 * 챌린지를 받는다. 옛 백엔드가 조각(#)에 붙여 보낸 값은 주소창에서 바로 지운다.
 */

const TOKEN_KEY = "short-link:access-token";
const CHALLENGE_KEY = "kurl:2fa-challenge";

function json(route: Route, status: number, body: object) {
  return route.fulfill({ status, json: body });
}

async function submitCode(page: Page) {
  await page.getByPlaceholder("123456").fill("123456");
  await page.getByRole("button", { name: "확인", exact: true }).click();
}

test.describe("로그인 주소에 토큰이 남지 않는다", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addInitScript(() => {
      window.localStorage.setItem("kurl:cookie-consent:v1", "accepted");
    });
  });

  test("콜백: 조각의 토큰은 읽지 않고 지우며, 쿠키로 받은 토큰으로 들어간다", async ({ page }) => {
    let refreshCalls = 0;
    let release!: () => void;
    const refreshAnswered = new Promise<void>((resolve) => (release = resolve));
    await mockBackend(page, {
      "POST /api/v1/auth/refresh": async (route) => {
        refreshCalls += 1;
        await refreshAnswered;
        return json(route, 200, { accessToken: "cookie-token" });
      },
    });

    await page.goto("/ko/auth/callback#access_token=url-token");

    await expect(page.getByText("로그인 처리 중…")).toBeVisible();
    await expect(page).toHaveURL(/\/ko\/auth\/callback$/);
    release();

    await expect(page).toHaveURL(/\/ko\/dashboard$/);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), TOKEN_KEY)).toBe(
      "cookie-token",
    );
    expect(refreshCalls).toBe(1);
  });

  test("콜백: 쿠키가 없으면 다시 로그인하라고 안내한다", async ({ page }) => {
    await mockBackend(page, {
      "POST /api/v1/auth/refresh": (route) =>
        json(route, 401, { status: 401, code: "INVALID_REFRESH_TOKEN" }),
    });

    await page.goto("/ko/auth/callback");

    await expect(page.getByRole("heading", { name: "로그인하지 못했어요" })).toBeVisible();
    await expect(page.getByText("쿠키가 꺼져 있거나 로그인 시간이 지났을 수 있어요.")).toBeVisible();
    await expect(page.getByRole("link", { name: "다시 로그인" })).toBeVisible();
  });

  test("2단계 인증: 구글 로그인은 쿠키에 맡기고 본문에 챌린지를 싣지 않는다", async ({ page }) => {
    let sent: unknown;
    await mockBackend(page, {
      "POST /api/v1/auth/2fa/verify": (route) => {
        sent = route.request().postDataJSON();
        return json(route, 200, { accessToken: "after-2fa" });
      },
    });

    await page.goto("/ko/auth/2fa");
    await submitCode(page);

    await expect(page).toHaveURL(/\/ko\/dashboard$/);
    expect(sent).toEqual({ code: "123456", recovery: false });
  });

  test("2단계 인증: Apple 로그인이 넘긴 챌린지는 본문으로 한 번만 쓴다", async ({ page }) => {
    let sent: unknown;
    await mockBackend(page, {
      "POST /api/v1/auth/2fa/verify": (route) => {
        sent = route.request().postDataJSON();
        return json(route, 200, { accessToken: "after-2fa" });
      },
    });
    await page.goto("/ko/login");
    await page.evaluate((key) => window.sessionStorage.setItem(key, "apple-challenge"), CHALLENGE_KEY);

    await page.goto("/ko/auth/2fa");
    await submitCode(page);

    await expect(page).toHaveURL(/\/ko\/dashboard$/);
    expect(sent).toEqual({ challenge: "apple-challenge", code: "123456", recovery: false });
    expect(await page.evaluate((key) => window.sessionStorage.getItem(key), CHALLENGE_KEY)).toBeNull();
  });

  test("2단계 인증: 옛 백엔드가 조각에 붙인 챌린지는 받되 주소창에서 지운다", async ({ page }) => {
    let sent: unknown;
    await mockBackend(page, {
      "POST /api/v1/auth/2fa/verify": (route) => {
        sent = route.request().postDataJSON();
        return json(route, 200, { accessToken: "after-2fa" });
      },
    });

    await page.goto("/ko/auth/2fa#challenge=fragment-challenge");
    await expect(page).toHaveURL(/\/ko\/auth\/2fa$/);
    await submitCode(page);

    await expect(page).toHaveURL(/\/ko\/dashboard$/);
    expect(sent).toEqual({ challenge: "fragment-challenge", code: "123456", recovery: false });
  });

  test("2단계 인증: 시간이 지나면 다시 로그인하라고 안내한다", async ({ page }) => {
    await mockBackend(page, {
      "POST /api/v1/auth/2fa/verify": (route) =>
        json(route, 401, { status: 401, code: "INVALID_REFRESH_TOKEN" }),
      "POST /api/v1/auth/refresh": (route) =>
        json(route, 401, { status: 401, code: "INVALID_REFRESH_TOKEN" }),
    });

    await page.goto("/ko/auth/2fa");
    await submitCode(page);

    await expect(page.getByText("인증 시간이 지났어요.")).toBeVisible();
    await expect(page.getByRole("link", { name: "다시 로그인" })).toBeVisible();
  });

  test("로그인 페이지의 목적지(?next=)로 구글 로그인이 돌아간다", async ({ page, baseURL }) => {
    await mockBackend(page, {
      "POST /api/v1/auth/refresh": (route) => json(route, 200, { accessToken: "cookie-token" }),
    });
    await page.route("**/oauth2/authorization/google", (route) =>
      route.fulfill({ status: 302, headers: { location: `${baseURL}/ko/auth/callback` } }),
    );

    await page.goto("/ko/login?next=/settings");
    await page.getByRole("button", { name: "Google 계정으로 로그인" }).click();

    await expect(page).toHaveURL(/\/ko\/settings$/);
  });

  test("목적지 없이 로그인하면 예전에 남은 목적지로 새지 않는다", async ({ page, baseURL }) => {
    await page.context().addCookies([
      { name: "kurl_login_next", value: encodeURIComponent("/ko/settings"), url: baseURL! },
    ]);
    await mockBackend(page, {
      "POST /api/v1/auth/refresh": (route) => json(route, 200, { accessToken: "cookie-token" }),
    });
    await page.route("**/oauth2/authorization/google", (route) =>
      route.fulfill({ status: 302, headers: { location: `${baseURL}/ko/auth/callback` } }),
    );

    await page.goto("/ko/login");
    await page.getByRole("button", { name: "Google 계정으로 로그인" }).click();

    await expect(page).toHaveURL(/\/ko\/dashboard$/);
  });
});
