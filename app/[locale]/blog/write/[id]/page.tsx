"use client";

import { PostEditorScreen } from "@/modules/blog/components/editor/post-editor-screen";

export default function EditPostPage({ params }: { params: { id: string } }) {
  return <PostEditorScreen postId={Number(params.id)} />;
}
