import type {
  MyProfile,
  ProfileBlock,
  ProfileReorderItem,
  ProfileStats,
  ProfileTheme,
  ProfileVisitSummary,
  PublicProfile,
} from "@/types";

import { API_BASE, request } from "./client";

export async function getMyProfile(): Promise<MyProfile> {
  return request<MyProfile>("/api/v1/users/me/profile", { method: "GET" });
}

export async function updateMyProfile(payload: {
  username?: string;
  bio?: string;
  theme?: ProfileTheme | null;
  /**
   * JSON array of {@link Social} entries (max 2). Backend validates each channel against the
   * allowed list and requires http(s) URLs. Pass an empty string `""` to clear all socials.
   */
  socials?: string;
}): Promise<MyProfile> {
  return request<MyProfile>("/api/v1/users/me/profile", { method: "PUT", body: payload });
}

export async function reorderProfileItems(items: ProfileReorderItem[]): Promise<MyProfile> {
  return request<MyProfile>("/api/v1/users/me/profile/order", {
    method: "PUT",
    body: { items },
  });
}

export async function createProfileBlock(payload: {
  type:
    | "TEXT"
    | "DIVIDER"
    | "IMAGE"
    | "EMBED"
    | "EMAIL_FORM"
    | "CONTACT_CARD"
    | "GALLERY"
    | "PRODUCT_CARD"
    | "BOOKING"
    | "EVENT"
    | "PLACE";
  content?: string;
}): Promise<ProfileBlock> {
  return request<ProfileBlock>("/api/v1/users/me/profile/blocks", {
    method: "POST",
    body: payload,
  });
}

export async function updateProfileBlock(id: number, content: string): Promise<ProfileBlock> {
  return request<ProfileBlock>(`/api/v1/users/me/profile/blocks/${id}`, {
    method: "PATCH",
    body: { content },
  });
}

export async function deleteProfileBlock(id: number): Promise<void> {
  await request(`/api/v1/users/me/profile/blocks/${id}`, { method: "DELETE" });
}

export async function toggleLinkOnProfile(
  shortCode: string,
  show: boolean,
): Promise<{ show: boolean }> {
  return request<{ show: boolean }>(`/api/v1/links/${shortCode}/profile`, {
    method: "PUT",
    body: { show },
  });
}

export async function setLinkHighlight(
  shortCode: string,
  highlighted: boolean,
): Promise<{ highlighted: boolean }> {
  return request<{ highlighted: boolean }>(`/api/v1/links/${shortCode}/profile/highlight`, {
    method: "PUT",
    body: { highlighted },
  });
}

export async function getPublicProfile(username: string): Promise<PublicProfile> {
  return request<PublicProfile>(`/api/v1/public/profiles/${username}`, { method: "GET" });
}

export async function getProfileStats(): Promise<ProfileStats> {
  return request<ProfileStats>(`/api/v1/users/me/profile/stats`, { method: "GET" });
}

export async function getProfileStatsSummary(): Promise<ProfileVisitSummary> {
  return request<ProfileVisitSummary>(`/api/v1/users/me/profile/stats/summary`, { method: "GET" });
}

export async function getPublicProfileStats(username: string): Promise<ProfileStats> {
  return request<ProfileStats>(`/api/v1/public/profiles/${encodeURIComponent(username)}/stats`, {
    method: "GET",
  });
}

export type ProfileStatsVisibility = { isPublic: boolean };

export async function getProfileStatsVisibility(): Promise<ProfileStatsVisibility> {
  return request<ProfileStatsVisibility>(`/api/v1/users/me/profile/stats/visibility`, {
    method: "GET",
  });
}

export async function setProfileStatsVisibility(
  isPublic: boolean,
): Promise<ProfileStatsVisibility> {
  // Pass the body as a plain object — {@link request} only adds the JSON Content-Type header
  // when it sees an object body (so it can both stringify and tag it). Pre-stringifying here
  // bypassed that branch and the BE rejected the call as text/plain.
  return request<ProfileStatsVisibility>(`/api/v1/users/me/profile/stats/visibility`, {
    method: "PATCH",
    body: { isPublic },
  });
}

/** Fire-and-forget beacon called by the public profile page on mount. Never blocks paint. */
export function postProfileVisit(username: string): void {
  if (typeof window === "undefined") return;
  const url = `${API_BASE}/api/v1/public/profiles/${encodeURIComponent(username)}/visit${window.location.search}`;
  // `navigator.sendBeacon` is the modern way to fire-and-forget — works even if the page is
  // unloading. Falls back to fetch with keepalive for browsers/contexts where sendBeacon is
  // unavailable.
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([""], { type: "text/plain" }));
      return;
    }
  } catch {
    // sendBeacon throws on some Safari versions when the body is empty — fall through to fetch.
  }
  void fetch(url, { method: "POST", keepalive: true, credentials: "omit" }).catch(() => {});
}

export type AvatarPresign = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  contentType: string;
  maxBytes: number;
  expiresIn: number;
};

export async function presignAvatarUpload(contentType: string): Promise<AvatarPresign> {
  return request<AvatarPresign>("/api/v1/users/me/avatar/presigned-url", {
    method: "POST",
    body: { contentType },
  });
}

export async function commitAvatarUpload(key: string): Promise<{ avatarUrl: string }> {
  return request<{ avatarUrl: string }>("/api/v1/users/me/avatar", {
    method: "PUT",
    body: { key },
  });
}

export async function deleteAvatar(): Promise<void> {
  await request("/api/v1/users/me/avatar", { method: "DELETE" });
}

export async function presignBannerUpload(contentType: string): Promise<AvatarPresign> {
  return request<AvatarPresign>("/api/v1/users/me/banner/presigned-url", {
    method: "POST",
    body: { contentType },
  });
}

export async function commitBannerUpload(key: string): Promise<{ bannerUrl: string }> {
  return request<{ bannerUrl: string }>("/api/v1/users/me/banner", {
    method: "PUT",
    body: { key },
  });
}

export async function deleteBanner(): Promise<void> {
  await request("/api/v1/users/me/banner", { method: "DELETE" });
}

/**
 * Profile-block image upload — used inside gallery / product card editor for images that go into
 * a block's JSON content (not user avatar / banner). Same presign + PUT + commit dance as banner,
 * but the commit returns {@code imageUrl} (no user-entity mutation).
 */
export async function presignProfileImageUpload(contentType: string): Promise<AvatarPresign> {
  return request<AvatarPresign>("/api/v1/users/me/profile/images/presigned-url", {
    method: "POST",
    body: { contentType },
  });
}

export async function commitProfileImageUpload(
  key: string,
): Promise<{ imageUrl: string; key: string }> {
  return request<{ imageUrl: string; key: string }>("/api/v1/users/me/profile/images", {
    method: "PUT",
    body: { key },
  });
}

/** Direct PUT to S3 with the presigned URL — same shape as avatar, kept separate for clarity. */
export async function uploadBannerToS3(
  uploadUrl: string,
  file: File,
  contentType: string,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`s3 upload failed: ${res.status}`);
  }
}

/** Direct PUT to S3 with the presigned URL — sets Content-Type so S3 accepts it. */
export async function uploadAvatarToS3(
  uploadUrl: string,
  file: File,
  contentType: string,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`s3 upload failed: ${res.status}`);
  }
}
