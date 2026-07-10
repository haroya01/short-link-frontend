import type { APIRequestContext } from "@playwright/test";

import { powHeaders } from "./pow";

export async function createLink(
  request: APIRequestContext,
  url: string,
  accessToken?: string,
  customCode?: string,
): Promise<{ shortCode: string; shortUrl: string }> {
  // Authenticated callers are identified by their Bearer token and skip PoW; anonymous callers
  // must mine a proof-of-work token first (backend enforces POW_REQUIRED on anonymous shorten).
  const headers: Record<string, string> = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : { ...(await powHeaders(request)) };
  const res = await request.post("/api/v1/links", {
    data: customCode ? { url, customCode } : { url },
    headers,
  });
  if (!res.ok()) {
    throw new Error(`create link failed (${res.status()}): ${await res.text()}`);
  }
  return res.json();
}
