import { request } from "@/lib/api/client";
import { stripImageMetadata } from "@/lib/image-resize";
import { fetchPublic, type FetchResult } from "@/modules/blog/api/public-posts";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";
// 목 노트는 목 빌드에서만 싣는다 — 조건이 빌드 상수로 접히면 require 가 번들에서 빠진다.
const noteMocks: typeof import("./_mocks") | null =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ? require("./_mocks") : null;

export const NOTE_MAX_LENGTH = 500;
export const NOTE_MAX_IMAGES = 4;
export const NOTE_ALT_MAX_LENGTH = 1500;

export interface NoteAuthor {
  id: number;
  username: string;
  avatarUrl: string | null;
}

export interface NoteMedia {
  url: string;
  altText: string | null;
  contentType: string;
}

export interface QuotedPost {
  id: number;
  title: string;
  slug: string;
  authorUsername: string;
}

export interface NoteLinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
}

export interface QuotedNote {
  id: number;
  body: string;
  createdAt: string;
  author: NoteAuthor;
  media: NoteMedia[];
}

/** `likeCount` and `repostCount` are the author's own numbers and null for everyone else (counts are
 *  not public). `likedByMe` and `repostedByMe` are null for anonymous readers. */
export interface Note {
  id: number;
  body: string;
  createdAt: string;
  editedAt: string | null;
  likeCount: number | null;
  likedByMe: boolean | null;
  author: NoteAuthor;
  media: NoteMedia[];
  quotedPost: QuotedPost | null;
  inReplyToId: number | null;
  replyCount: number;
  repostCount: number | null;
  repostedByMe: boolean | null;
  quotedNote: QuotedNote | null;
  /** Open Graph card for the body's first link, fetched by the server after posting. */
  linkPreview: NoteLinkPreview | null;
}

export interface NoteFeed {
  items: Note[];
  page: number;
  hasNext: boolean;
}

export interface NoteThread {
  note: Note;
  parent: Note | null;
  replies: Note[];
}

export interface NoteDraftImage {
  key: string;
  altText: string;
}

export interface NoteDraft {
  body: string;
  images: NoteDraftImage[];
  quotedPostId: number | null;
  inReplyToId: number | null;
  quotedNoteId: number | null;
}

export interface FederationSettings {
  enabled: boolean;
  noticeSeen: boolean;
  handle: string | null;
}

interface PresignedNoteImage {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  maxBytes: number;
}

export type NoteImageErrorCode = "not-image" | "too-large" | "upload-failed";

export class NoteImageUploadError extends Error {
  constructor(readonly code: NoteImageErrorCode) {
    super(code);
    this.name = "NoteImageUploadError";
  }
}

export function listEveryoneNotes(page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockEveryoneNotes(page));
  return request<NoteFeed>(`/api/v1/public/notes?page=${page}&size=20`, { method: "GET" });
}

/** Client-side author page (carries the viewer's token, so likedByMe and the author's own counts
 *  come back filled in). */
export function listAuthorNotes(username: string, page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockAuthorNotes(username, page));
  return request<NoteFeed>(
    `/api/v1/public/profiles/${encodeURIComponent(username)}/notes?page=${page}&size=20`,
    { method: "GET" },
  );
}

export function listAuthorReposts(username: string, page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockAuthorReposts(username, page));
  return request<NoteFeed>(
    `/api/v1/public/profiles/${encodeURIComponent(username)}/reposts?page=${page}&size=20`,
    { method: "GET" },
  );
}

export function fetchAuthorReposts(username: string): Promise<FetchResult<NoteFeed>> {
  if (noteMocks) {
    return Promise.resolve({ ok: true, data: noteMocks.mockAuthorReposts(username, 0) });
  }
  return fetchPublic<NoteFeed>(
    `/api/v1/public/profiles/${encodeURIComponent(username)}/reposts?page=0&size=20`,
  );
}

/** Server-side, anonymous first page for the public notes tab. */
export function fetchAuthorNotes(username: string): Promise<FetchResult<NoteFeed>> {
  if (noteMocks) return Promise.resolve({ ok: true, data: noteMocks.mockAuthorNotes(username, 0) });
  return fetchPublic<NoteFeed>(
    `/api/v1/public/profiles/${encodeURIComponent(username)}/notes?page=0&size=20`,
  );
}

/** Server-side, anonymous thread for the note page and its metadata. */
export function fetchNoteThread(id: number): Promise<FetchResult<NoteThread>> {
  if (noteMocks) {
    const thread = noteMocks.mockThread(id);
    return Promise.resolve(thread ? { ok: true, data: thread } : { ok: false, status: 404 });
  }
  return fetchPublic<NoteThread>(`/api/v1/public/notes/${id}`, { noStore: true });
}

export function getNoteThread(id: number): Promise<NoteThread> {
  if (noteMocks) {
    const thread = noteMocks.mockThread(id);
    return thread ? Promise.resolve(thread) : Promise.reject(new Error("not found"));
  }
  return request<NoteThread>(`/api/v1/public/notes/${id}`, { method: "GET" });
}

export function createNote(draft: NoteDraft): Promise<Note> {
  if (noteMocks) return Promise.resolve(noteMocks.mockCreate(draft));
  return request<Note>("/api/v1/notes", { method: "POST", body: draft });
}

export function editNote(id: number, body: string): Promise<Note> {
  if (noteMocks) return Promise.resolve(noteMocks.mockEdit(id, body));
  return request<Note>(`/api/v1/notes/${id}`, { method: "PATCH", body: { body } });
}

export function deleteNote(id: number): Promise<void> {
  if (noteMocks) return Promise.resolve(noteMocks.mockDelete(id));
  return request<void>(`/api/v1/notes/${id}`, { method: "DELETE" });
}

export function setNoteLike(id: number, on: boolean): Promise<{ liked: boolean; likeCount: number }> {
  if (USE_MOCKS) return Promise.resolve({ liked: on, likeCount: 0 });
  return request(`/api/v1/notes/${id}/like`, { method: on ? "PUT" : "DELETE" });
}

export function setNoteRepost(
  id: number,
  on: boolean,
): Promise<{ reposted: boolean; repostCount: number }> {
  if (noteMocks) return Promise.resolve(noteMocks.mockRepost(id, on));
  return request(`/api/v1/notes/${id}/repost`, { method: on ? "PUT" : "DELETE" });
}

export function likedNoteIds(ids: number[]): Promise<number[]> {
  if (ids.length === 0 || USE_MOCKS) return Promise.resolve([]);
  return request<{ likedIds: number[] }>(`/api/v1/notes/like-status?ids=${ids.join(",")}`, {
    method: "GET",
  }).then((r) => r.likedIds);
}

/** presign → PUT straight to storage. Returns the key to name when posting, plus a preview URL. */
export async function uploadNoteImage(file: File): Promise<{ key: string; previewUrl: string }> {
  if (!file.type.startsWith("image/")) throw new NoteImageUploadError("not-image");
  if (USE_MOCKS) return { key: `note-images/mock/${file.name}`, previewUrl: URL.createObjectURL(file) };
  const safe = await stripImageMetadata(file);
  const presigned = await request<PresignedNoteImage>("/api/v1/notes/images/presign", {
    method: "POST",
    body: { contentType: safe.type },
  });
  if (safe.size > presigned.maxBytes) throw new NoteImageUploadError("too-large");
  const put = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": safe.type },
    body: safe,
  });
  if (!put.ok) throw new NoteImageUploadError("upload-failed");
  return { key: presigned.key, previewUrl: presigned.publicUrl };
}

export function getFederationSettings(): Promise<FederationSettings> {
  if (noteMocks) return Promise.resolve(noteMocks.mockFederationSettings());
  return request<FederationSettings>("/api/v1/federation/settings", { method: "GET" });
}

export function updateFederationSettings(
  patch: Partial<Pick<FederationSettings, "enabled">> & { noticeSeen?: boolean },
): Promise<FederationSettings> {
  if (noteMocks) return Promise.resolve(noteMocks.mockUpdateFederationSettings(patch));
  return request<FederationSettings>("/api/v1/federation/settings", { method: "PUT", body: patch });
}
