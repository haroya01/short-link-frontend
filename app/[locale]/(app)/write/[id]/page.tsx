"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  deletePost,
  getBlocks,
  getPost,
  publishPost,
  replaceBlocks,
  republishPost,
  unpublishPost,
  updatePostMetadata,
  type PostView,
} from "@/lib/api/posts";
import { uploadPostImage } from "@/lib/api/post-images";
import { blocksToMarkdown, markdownToBlocks } from "@/lib/markdown-to-blocks";

export default function EditPostPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { ready, authenticated } = useAuth();
  const postId = Number(params.id);
  const [post, setPost] = useState<PostView | null>(null);
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(postId)) return;
    setLoading(true);
    setError(null);
    try {
      const [p, blocks] = await Promise.all([getPost(postId), getBlocks(postId)]);
      setPost(p);
      setTitle(p.title);
      setMarkdown(blocksToMarkdown(blocks));
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    void load();
  }, [ready, authenticated, load]);

  async function handleSave() {
    if (post == null || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (title.trim() !== post.title) {
        const updated = await updatePostMetadata(post.id, { title: title.trim() });
        setPost(updated);
      }
      const blocks = markdownToBlocks(markdown);
      await replaceBlocks(post.id, blocks);
      setLastSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(action: "publish" | "unpublish" | "republish") {
    if (post == null || busy) return;
    setBusy(true);
    setError(null);
    try {
      let updated: PostView;
      if (action === "publish") updated = await publishPost(post.id);
      else if (action === "unpublish") updated = await unpublishPost(post.id);
      else updated = await republishPost(post.id);
      setPost(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setBusy(false);
    }
  }

  async function handleImageUpload(file: File) {
    if (post == null || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const imageUrl = await uploadPostImage(post.id, file);
      const alt = file.name.replace(/\.[^.]+$/, "");
      const snippet = `\n\n![${alt}](${imageUrl})\n\n`;
      const ta = textareaRef.current;
      if (ta) {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const next = markdown.slice(0, start) + snippet + markdown.slice(end);
        setMarkdown(next);
        // restore cursor after the inserted markdown
        window.setTimeout(() => {
          ta.focus();
          const pos = start + snippet.length;
          ta.setSelectionRange(pos, pos);
        }, 0);
      } else {
        setMarkdown((prev) => prev + snippet);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "이미지 업로드 실패");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (post == null) return;
    if (!window.confirm("정말 삭제하시겠습니까? 본문과 모든 리비전이 함께 삭제됩니다.")) return;
    setBusy(true);
    setError(null);
    try {
      await deletePost(post.id);
      router.push("/write");
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete failed");
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (!authenticated) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-gray-600">로그인이 필요합니다.</p>
      </main>
    );
  }
  if (loading) return <main className="mx-auto max-w-3xl px-6 py-12 text-gray-500">로딩 중…</main>;
  if (!post)
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-red-600">글을 찾을 수 없습니다.</p>
        {error && <p className="mt-2 text-sm text-gray-500">{error}</p>}
      </main>
    );

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <a href="/write" className="text-sm text-gray-500 hover:underline">
            ← 글 목록
          </a>
          <p className="mt-1 text-xs text-gray-400 font-mono">slug: {post.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">상태: {post.status}</span>
          {post.status === "DRAFT" && (
            <button
              type="button"
              onClick={() => handleStatus("publish")}
              disabled={busy}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              발행
            </button>
          )}
          {post.status === "PUBLISHED" && (
            <button
              type="button"
              onClick={() => handleStatus("unpublish")}
              disabled={busy}
              className="rounded border border-amber-500 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              발행 취소
            </button>
          )}
          {post.status === "UNPUBLISHED" && (
            <button
              type="button"
              onClick={() => handleStatus("republish")}
              disabled={busy}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              재발행
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            삭제
          </button>
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        className="mb-6 w-full border-0 border-b border-gray-200 bg-transparent pb-2 text-3xl font-bold focus:border-emerald-600 focus:outline-none focus:ring-0"
        placeholder="제목"
      />

      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {uploading ? "업로드 중…" : "📷 이미지 삽입"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImageUpload(file);
          }}
        />
        <span className="text-xs text-gray-400">jpg / png / webp / gif</span>
      </div>
      <textarea
        ref={textareaRef}
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        className="min-h-[60vh] w-full resize-y rounded border border-gray-200 p-4 font-mono text-sm leading-relaxed focus:border-emerald-600 focus:outline-none"
        placeholder={"본문은 markdown 으로 입력하세요.\n\n# 제목\n## 부제목\n\n단락 텍스트\n\n- 리스트 1\n- 리스트 2\n\n> 인용\n\n![alt](https://image.url)"}
      />

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {lastSavedAt && `저장 ${lastSavedAt.toLocaleTimeString()}`}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </main>
  );
}
