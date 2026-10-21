import { request } from "@/lib/api/client";
import { stripImageMetadata } from "@/lib/image-resize";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

/** `too-large` carries the sizes so the message can name the actual limit. */
export type PostImageErrorCode = "not-image" | "unsupported-format" | "too-large" | "upload-failed";

export class PostImageUploadError extends Error {
  constructor(
    readonly code: PostImageErrorCode,
    readonly detail?: Record<string, string | number>,
  ) {
    super(code);
    this.name = "PostImageUploadError";
  }
}

export function postImageErrorMessageKey(e: unknown): {
  key: "uploadNotImage" | "uploadUnsupportedFormat" | "uploadTooLarge" | "imageError";
  values?: Record<string, string | number>;
} {
  if (e instanceof PostImageUploadError) {
    if (e.code === "not-image") return { key: "uploadNotImage" };
    if (e.code === "unsupported-format" && e.detail) return { key: "uploadUnsupportedFormat", values: e.detail };
    if (e.code === "too-large" && e.detail) return { key: "uploadTooLarge", values: e.detail };
  }
  return { key: "imageError" };
}

/** The formats the server presigns for; anything else is refused there with a bare 403. */
export const POST_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function postImageTypeError(file: File): PostImageUploadError | null {
  if (!file.type.startsWith("image/")) return new PostImageUploadError("not-image");
  if (POST_IMAGE_TYPES.includes(file.type)) return null;
  return new PostImageUploadError("unsupported-format", {
    format: file.type.slice("image/".length).split("+")[0].toUpperCase(),
  });
}

export interface PresignResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  contentType: string;
  maxBytes: number;
  expiresIn: number;
}

export interface CommitResult {
  imageUrl: string;
  key: string;
}

function presignPostImage(
  postId: number,
  contentType: string,
): Promise<PresignResult> {
  return request<PresignResult>(`/api/v1/posts/${postId}/images/presign`, {
    method: "POST",
    body: { contentType },
  });
}

function commitPostImage(postId: number, key: string): Promise<CommitResult> {
  return request<CommitResult>(`/api/v1/posts/${postId}/images/commit`, {
    method: "POST",
    body: { key },
  });
}

/** Pasted `<img src>` URLs (Notion etc.) expire or are CORS-locked, so the server re-hosts them. */
export async function importPostImage(postId: number, url: string): Promise<string> {
  // Mock: no backend to re-host through, so leave the external URL as-is — the editor still shows it.
  if (USE_MOCKS) return url;
  const result = await request<CommitResult>(`/api/v1/posts/${postId}/images/import`, {
    method: "POST",
    body: { url },
  });
  return result.imageUrl;
}

export async function uploadPostImage(postId: number, file: File): Promise<string> {
  const typeError = postImageTypeError(file);
  if (typeError) throw typeError;
  // Mock: no object store, so a session-only object URL stands in for the uploaded image.
  if (USE_MOCKS) return URL.createObjectURL(file);
  // Drop EXIF (incl. capture GPS) before the file reaches the bucket or a public post.
  const safe = await stripImageMetadata(file);
  const presigned = await presignPostImage(postId, safe.type);
  if (safe.size > presigned.maxBytes) {
    throw new PostImageUploadError("too-large", {
      sizeMb: Number((safe.size / 1024 / 1024).toFixed(1)),
      maxMb: Number((presigned.maxBytes / 1024 / 1024).toFixed(1)),
    });
  }
  const putRes = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": safe.type },
    body: safe,
  });
  if (!putRes.ok) {
    throw new PostImageUploadError("upload-failed");
  }
  const commit = await commitPostImage(postId, presigned.key);
  return commit.imageUrl;
}
