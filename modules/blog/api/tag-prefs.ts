import { request } from "@/lib/api/client";

/** A user's tag preferences — mirrors the backend TagPrefsView. */
export interface TagPrefs {
  followed: string[];
  hidden: string[];
}

const base = "/api/v1/users/me/tag-prefs";
const enc = (tag: string) => encodeURIComponent(tag);

export function getTagPrefs(): Promise<TagPrefs> {
  return request<TagPrefs>(base, { method: "GET" });
}

// Each mutation returns the full updated prefs so callers replace state in one round-trip.
export function followTag(tag: string): Promise<TagPrefs> {
  return request<TagPrefs>(`${base}/followed/${enc(tag)}`, { method: "PUT" });
}

export function unfollowTag(tag: string): Promise<TagPrefs> {
  return request<TagPrefs>(`${base}/followed/${enc(tag)}`, { method: "DELETE" });
}

export function hideTag(tag: string): Promise<TagPrefs> {
  return request<TagPrefs>(`${base}/hidden/${enc(tag)}`, { method: "PUT" });
}

export function unhideTag(tag: string): Promise<TagPrefs> {
  return request<TagPrefs>(`${base}/hidden/${enc(tag)}`, { method: "DELETE" });
}
