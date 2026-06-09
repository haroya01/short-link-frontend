import { request } from "@/lib/api/client";
import { USE_MOCKS } from "@/modules/blog/api/_mocks";

/** A user's tag preferences — mirrors the backend TagPrefsView. */
export interface TagPrefs {
  followed: string[];
  hidden: string[];
}

const base = "/api/v1/users/me/tag-prefs";
const enc = (tag: string) => encodeURIComponent(tag);

// Demo prefs so the unified 팔로잉 피드(작가+주제)와 보고싶은 태그 strip 이 백엔드 없이도 보인다.
const mockPrefs: TagPrefs = { followed: ["개발", "일상"], hidden: [] };

export function getTagPrefs(): Promise<TagPrefs> {
  if (USE_MOCKS) return Promise.resolve(mockPrefs);
  return request<TagPrefs>(base, { method: "GET" });
}

// In mock mode mutate the in-memory demo prefs and echo them back (the same shape the API returns),
// so toggles work locally without a backend. Each mutation returns the full updated prefs so callers
// replace state in one round-trip.
function mockMutate(tag: string, into: "followed" | "hidden", on: boolean): Promise<TagPrefs> {
  const other = into === "followed" ? "hidden" : "followed";
  mockPrefs[into] = on
    ? [...mockPrefs[into].filter((x) => x !== tag), tag]
    : mockPrefs[into].filter((x) => x !== tag);
  if (on) mockPrefs[other] = mockPrefs[other].filter((x) => x !== tag); // FOLLOW/HIDE are exclusive
  return Promise.resolve({ followed: [...mockPrefs.followed], hidden: [...mockPrefs.hidden] });
}

export function followTag(tag: string): Promise<TagPrefs> {
  if (USE_MOCKS) return mockMutate(tag, "followed", true);
  return request<TagPrefs>(`${base}/followed/${enc(tag)}`, { method: "PUT" });
}

export function unfollowTag(tag: string): Promise<TagPrefs> {
  if (USE_MOCKS) return mockMutate(tag, "followed", false);
  return request<TagPrefs>(`${base}/followed/${enc(tag)}`, { method: "DELETE" });
}

export function hideTag(tag: string): Promise<TagPrefs> {
  if (USE_MOCKS) return mockMutate(tag, "hidden", true);
  return request<TagPrefs>(`${base}/hidden/${enc(tag)}`, { method: "PUT" });
}

export function unhideTag(tag: string): Promise<TagPrefs> {
  if (USE_MOCKS) return mockMutate(tag, "hidden", false);
  return request<TagPrefs>(`${base}/hidden/${enc(tag)}`, { method: "DELETE" });
}
