"use client";

import { rememberPostKey } from "@/modules/blog/lib/post-access";

export function PostKeyScope({ postId, postKey }: { postId: number; postKey: string }) {
  rememberPostKey(postId, postKey);
  return null;
}
