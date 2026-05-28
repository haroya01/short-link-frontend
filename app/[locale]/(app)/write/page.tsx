"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  createPost,
  listMyPosts,
  type PostStatus,
  type PostView,
} from "@/lib/api/posts";

export default function WriteIndexPage() {
  const router = useRouter();
  const { ready, authenticated } = useAuth();
  const [posts, setPosts] = useState<PostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await listMyPosts());
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    void load();
  }, [ready, authenticated, load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const post = await createPost({ slug: slug.trim(), title: title.trim() });
      router.push(`/write/${post.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
      setCreating(false);
    }
  }

  if (!ready) return null;
  if (!authenticated) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-gray-600">로그인이 필요합니다.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">글</h1>
        <p className="mt-2 text-sm text-gray-500">
          본인 글 목록 + 새 글 작성. 본격 블록 에디터는 별도 작업 (Wave 2). 현재 minimal markdown
          기반.
        </p>
      </header>

      <section className="mb-12 rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-medium text-gray-700">새 글 만들기</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <label className="block text-sm">
            <span className="text-gray-700">제목</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-700">slug</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              minLength={2}
              maxLength={200}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
              placeholder="my-first-post"
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-mono"
            />
            <span className="mt-1 block text-xs text-gray-500">
              발행 후 변경 불가. 영문 소문자/숫자/하이픈만.
            </span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {creating ? "생성 중…" : "초안 만들기"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-gray-700">내 글</h2>
        {loading && <p className="text-gray-500">로딩 중…</p>}
        {!loading && posts.length === 0 && (
          <p className="text-gray-500">아직 작성한 글이 없습니다.</p>
        )}
        {!loading && posts.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {posts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <StatusBadge status={p.status} />
                <a
                  href={`/write/${p.id}`}
                  className="flex-1 truncate text-sm text-gray-900 hover:underline"
                >
                  {p.title}
                </a>
                <span className="text-xs text-gray-400 font-mono">{p.slug}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: PostStatus }) {
  const map: Record<PostStatus, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SCHEDULED: "bg-blue-100 text-blue-800",
    PUBLISHED: "bg-emerald-100 text-emerald-800",
    UNPUBLISHED: "bg-amber-100 text-amber-800",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status]}`}>{status}</span>
  );
}
