import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";

export async function devLogin(
  request: APIRequestContext,
  email: string,
): Promise<{ accessToken: string }> {
  const res = await request.post("/api/v1/auth/dev-login", {
    data: { email },
  });
  if (!res.ok()) {
    throw new Error(`dev-login failed (${res.status()}): ${await res.text()}`);
  }
  const body = (await res.json()) as { accessToken: string };
  return body;
}

export async function signInAs(
  page: Page,
  context: BrowserContext,
  email: string,
): Promise<string> {
  const tokens = await devLogin(context.request, email);
  const installToken = (token: string) => {
    window.localStorage.setItem("short-link:access-token", token);
  };
  await context.addInitScript(installToken, tokens.accessToken);
  await page.addInitScript(installToken, tokens.accessToken);
  return tokens.accessToken;
}

export function uniqueEmail(prefix = "e2e"): string {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return `${prefix}-${id}@e2e.kurl.test`;
}
