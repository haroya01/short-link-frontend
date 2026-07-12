import { request } from "@/lib/api/client";
import { stripImageMetadata } from "@/lib/image-resize";
import { USE_MOCKS } from "@/modules/blog/api/_mocks";

/** Why an image upload was rejected, as a code the caller localizes (keeps display copy out of this
 *  data module). `too-large` carries the sizes so the message can name the actual limit. */
export type PostImageErrorCode = "not-image" | "too-large" | "upload-failed";

export class PostImageUploadError extends Error {
  constructor(
    readonly code: PostImageErrorCode,
    readonly detail?: { sizeMb: number; maxMb: number },
  ) {
    super(code);
    this.name = "PostImageUploadError";
  }
}

/** Map an upload rejection to a `postEditor` message key (+ interpolation values), so the two upload
 *  surfaces (editor body, cover picker) share one copy decision. Non-typed errors → the generic key. */
export function postImageErrorMessageKey(e: unknown): {
  key: "uploadNotImage" | "uploadTooLarge" | "imageError";
  values?: Record<string, number>;
} {
  if (e instanceof PostImageUploadError) {
    if (e.code === "not-image") return { key: "uploadNotImage" };
    if (e.code === "too-large" && e.detail) return { key: "uploadTooLarge", values: e.detail };
  }
  return { key: "imageError" };
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

export function presignPostImage(
  postId: number,
  contentType: string,
): Promise<PresignResult> {
  return request<PresignResult>(`/api/v1/posts/${postId}/images/presign`, {
    method: "POST",
    body: { contentType },
  });
}

export function commitPostImage(postId: number, key: string): Promise<CommitResult> {
  return request<CommitResult>(`/api/v1/posts/${postId}/images/commit`, {
    method: "POST",
    body: { key },
  });
}

/**
 * Re-host an external image URL into our bucket (server fetches it). For images pasted from Notion
 * 등 where the clipboard carries an `<img src>` pointing at an expiring/CORS-locked URL — hotlinking
 * those would rot after publish, so the server re-hosts to a kurl-owned URL.
 */
export async function importPostImage(postId: number, url: string): Promise<string> {
  // Mock: no backend to re-host through, so leave the external URL as-is — the editor still shows it.
  if (USE_MOCKS) return url;
  const result = await request<CommitResult>(`/api/v1/posts/${postId}/images/import`, {
    method: "POST",
    body: { url },
  });
  return result.imageUrl;
}

/**
 * Two-step upload: presign → PUT → commit. 결과적으로 markdown 에 박을 수 있는 public URL 반환.
 */
export async function uploadPostImage(postId: number, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new PostImageUploadError("not-image");
  }
  // Mock: skip presign→PUT→commit (no backend / object store) and hand back a local object URL so the
  // image drops into the editor markdown immediately. Lives only for this session — fine for a demo.
  if (USE_MOCKS) return URL.createObjectURL(file);
  // Re-encode to drop EXIF (incl. capture GPS) before it reaches our bucket / a public post. The
  // cropper already does this for avatar/banner/profile images; body images uploaded raw did not.
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
