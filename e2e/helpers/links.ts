import type { APIRequestContext } from "@playwright/test";

export async function createLink(
  request: APIRequestContext,
  url: string,
  accessToken?: string,
  customCode?: string,
): Promise<{ shortCode: string; shortUrl: string }> {
  const res = await request.post("/api/v1/links", {
    data: customCode ? { url, customCode } : { url },
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  if (!res.ok()) {
    throw new Error(`create link failed (${res.status()}): ${await res.text()}`);
  }
  return res.json();
}
