import type { Page, Route } from "@playwright/test";
import { mockLinksResponse } from "../../lib/api/_links-mocks";
import { mockBlogNotificationPreferences } from "../../modules/notifications/api/_mocks";

export const ME = {
  id: 1,
  email: "e2e@kurl.test",
  role: "USER",
  createdAt: "2026-05-01T00:00:00Z",
  username: "e2euser",
  timezone: "Asia/Seoul",
};

export const MY_PROFILE = {
  username: "e2euser",
  bio: null,
  theme: null,
  publicUrl: "https://kurl.me/u/e2euser",
  avatarUrl: null,
  bannerUrl: null,
  socials: [],
  hideFollowerCount: false,
};

type Handler = (route: Route) => unknown;

const DEFAULTS: Record<string, () => unknown> = {
  "GET /api/v1/notifications/unread-count": () => ({ count: 0 }),
  "POST /api/v1/users/me/clicks/stream-token": () => ({ token: "e2e" }),
  "GET /api/v1/users/me/profile": () => MY_PROFILE,
  "GET /api/v1/users/me/profile/stats/summary": () => ({ today: 0, week: 0, month: 0, allTime: 0 }),
  "GET /api/v1/notifications/blog-preferences": () => mockBlogNotificationPreferences(),
  "GET /api/v1/users/me/feed-prefs": () => ({ defaultTab: "recent" }),
  "GET /api/v1/users/me/tag-prefs": () => ({ followed: [], hidden: [] }),
};

export async function signIn(page: Page) {
  await page.context().addInitScript(() => {
    window.localStorage.setItem("short-link:access-token", "e2e-token");
    window.localStorage.setItem("kurl:cookie-consent:v1", "accepted");
  });
}

export async function mockBackend(page: Page, handlers: Record<string, Handler> = {}, me: object = ME) {
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const key = `${req.method()} ${url.pathname}`;
    const own = handlers[key];
    if (own) return own(route);
    if (key === "GET /api/v1/users/me") return route.fulfill({ json: me });
    if (DEFAULTS[key]) return route.fulfill({ json: DEFAULTS[key]() });
    const body = req.postData() ? JSON.parse(req.postData()!) : undefined;
    const mocked = mockLinksResponse(url.pathname + url.search, req.method(), body);
    if (mocked !== undefined) return route.fulfill({ json: mocked ?? {} });
    return route.fulfill({ status: 404, json: { title: "not mocked", detail: key } });
  });
}
