import type {
  BulkImportSummary,
  ClaimResult,
  CreateLinkRequest,
  CreateLinkResponse,
  LinkDetail,
  LinkProtectionRequest,
  LinkProtectionResponse,
  MyLink,
  MyLinksPage,
  OgOverrideRequest,
  OgOverrideResponse,
  ProblemDetail,
  TagSummary,
  UpdateLinkRequest,
} from "@/types";

import { ApiError, readToken, request, setToken, withBase } from "./client";

export async function shortenUrl(payload: CreateLinkRequest): Promise<CreateLinkResponse> {
  try {
    return await shortenUrlOnce(payload);
  } catch (e) {
    // Stale token edge case: localStorage still has an access token whose backing session has
    // expired. We sent it as Bearer, backend rejected it silently, then the link-create endpoint
    // saw the request as anonymous and demanded a PoW token we didn't attach (because we thought
    // we were authenticated). Clear the dead token + retry on the anonymous path with a fresh
    // PoW. The standard 401 -> refresh dance in {@link request} can't help here because it
    // refreshes the access token but the original {@link shortenUrl} already committed to the
    // authenticated branch when it decided whether to compute PoW.
    if (e instanceof ApiError && e.status === 401 && e.detail.code === "POW_REQUIRED") {
      setToken(null);
      return shortenUrlOnce(payload);
    }
    throw e;
  }
}

async function shortenUrlOnce(payload: CreateLinkRequest): Promise<CreateLinkResponse> {
  const headers: Record<string, string> = {};
  // Anonymous shorten requires a fresh PoW token; authenticated users skip it (they're
  // identified by access token + per-user rate limit).
  if (!readToken()) {
    const { getPowToken, clearPowToken } = await import("../pow");
    const pow = await getPowToken();
    if (pow) {
      headers["X-Pow-Challenge"] = pow.challenge;
      headers["X-Pow-Nonce"] = pow.nonce;
    }
    // Each token is single-use, so clear the cached one after we attach it.
    clearPowToken();
  }
  return request<CreateLinkResponse>("/api/v1/links", {
    method: "POST",
    body: payload,
    headers,
  });
}

export type MyLinksFilters = {
  size?: number;
  /** Opaque cursor from a previous page's nextCursor; omit for the first page. */
  after?: string;
  q?: string;
  tag?: string;
  domain?: string;
  expiry?: "NEVER" | "ACTIVE" | "EXPIRED" | "HAS_EXPIRY" | "EXPIRING_SOON";
  createdAfter?: string;
  createdBefore?: string;
};

export async function listMyLinks(params?: MyLinksFilters): Promise<MyLinksPage> {
  const qs = new URLSearchParams();
  if (params?.size) qs.set("size", String(params.size));
  if (params?.after) qs.set("after", params.after);
  if (params?.q) qs.set("q", params.q);
  if (params?.tag) qs.set("tag", params.tag);
  if (params?.domain) qs.set("domain", params.domain);
  if (params?.expiry) qs.set("expiry", params.expiry);
  if (params?.createdAfter) qs.set("createdAfter", params.createdAfter);
  if (params?.createdBefore) qs.set("createdBefore", params.createdBefore);
  const suffix = qs.toString() ? `?${qs}` : "";
  return request<MyLinksPage>(`/api/v1/links/me${suffix}`, { method: "GET" });
}

export async function listTags(): Promise<TagSummary[]> {
  return request<TagSummary[]>("/api/v1/tags", { method: "GET" });
}

export async function deleteTag(id: number): Promise<void> {
  await request(`/api/v1/tags/${id}`, { method: "DELETE" });
}

export async function setLinkTags(shortCode: string, tags: string[]): Promise<void> {
  await request(`/api/v1/links/${shortCode}/tags`, {
    method: "PUT",
    body: { tags },
  });
}

export async function updateLink(
  shortCode: string,
  payload: UpdateLinkRequest,
): Promise<MyLink> {
  return request<MyLink>(`/api/v1/links/${shortCode}`, { method: "PATCH", body: payload });
}

export async function deleteLink(shortCode: string): Promise<void> {
  await request(`/api/v1/links/${shortCode}`, { method: "DELETE" });
}

export async function getLinkDetail(shortCode: string): Promise<LinkDetail> {
  return request<LinkDetail>(`/api/v1/links/${shortCode}/detail`, { method: "GET" });
}

export async function setLinkOgOverride(
  shortCode: string,
  payload: OgOverrideRequest,
): Promise<OgOverrideResponse> {
  return request<OgOverrideResponse>(`/api/v1/links/${shortCode}/og`, {
    method: "PATCH",
    body: payload,
  });
}

export async function setLinkProtection(
  shortCode: string,
  payload: LinkProtectionRequest,
): Promise<LinkProtectionResponse> {
  return request<LinkProtectionResponse>(`/api/v1/links/${shortCode}/protection`, {
    method: "PATCH",
    body: payload,
  });
}

export async function setLinkVisibility(
  shortCode: string,
  statsPublic: boolean,
): Promise<{ shortCode: string; statsPublic: boolean }> {
  return request(`/api/v1/links/${shortCode}/visibility`, {
    method: "PATCH",
    body: { statsPublic },
  });
}

export async function claimAnonymousLinks(claimTokens: string[]): Promise<ClaimResult> {
  return request<ClaimResult>("/api/v1/users/me/claim-anonymous", {
    method: "POST",
    body: { claimTokens },
  });
}

export async function bulkImportLinks(file: File): Promise<BulkImportSummary> {
  const form = new FormData();
  form.append("file", file);
  const token = readToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(withBase("/api/v1/links/bulk"), {
    method: "POST",
    credentials: "include",
    headers,
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    let parsed: ProblemDetail;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { status: res.status, detail: text || res.statusText };
    }
    throw new ApiError(res.status, parsed);
  }
  return {
    ok: Number(res.headers.get("X-Bulk-Ok") ?? 0),
    failed: Number(res.headers.get("X-Bulk-Failed") ?? 0),
    resultCsv: text,
  };
}
