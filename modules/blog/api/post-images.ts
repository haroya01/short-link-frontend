import { request } from "@/lib/api/client";

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
 * Two-step upload: presign → PUT → commit. 결과적으로 markdown 에 박을 수 있는 public URL 반환.
 */
export async function uploadPostImage(postId: number, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드 가능합니다.");
  }
  const presigned = await presignPostImage(postId, file.type);
  if (file.size > presigned.maxBytes) {
    throw new Error(
      `파일 크기가 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB > ${(
        presigned.maxBytes /
        1024 /
        1024
      ).toFixed(1)}MB)`,
    );
  }
  const putRes = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`업로드 실패: ${putRes.status}`);
  }
  const commit = await commitPostImage(postId, presigned.key);
  return commit.imageUrl;
}
