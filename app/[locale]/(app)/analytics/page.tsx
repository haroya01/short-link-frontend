"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listMyPosts, type PostStatus, type PostView } from "@/lib/api/posts";

export default function AnalyticsPage() {
  const { ready, authenticated } = useAuth();
  const [posts, setPosts] = useState<PostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const stats = useMemo(() => {
    let totalViews = 0;
    let published = 0;
    let drafts = 0;
    for (const p of posts) {
      totalViews += p.viewCount;
      if (p.status === "PUBLISHED") published++;
      else if (p.status === "DRAFT") drafts++;
    }
    return { totalViews, published, drafts };
  }, [posts]);

  if (!ready) return null;
  if (!authenticated) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-gray-600">로그인이 필요합니다.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">분석</h1>
        <p className="mt-2 text-sm text-gray-500">
          글별 view 카운터 (v0). 정밀한 unique visitor / 읽은 시간 / 스크롤 깊이는 L3 tracking
          JS 도입 후.
        </p>
      </header>

      <section className="mb-10 grid grid-cols-3 gap-4">
        <StatCard label="총 조회수" value={stats.totalViews.toLocaleString()} />
        <StatCard label="발행 글" value={stats.published.toString()} />
        <StatCard label="초안" value={stats.drafts.toString()} />
      </section>

      {loading && <p className="text-gray-500">로딩 중…</p>}
      {error && <p className="text-red-600">에러: {error}</p>}

      {!loading && posts.length === 0 && (
        <p className="text-gray-500">아직 작성한 글이 없습니다.</p>
      )}

      {!loading && posts.length > 0 && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
              <th className="px-2 py-2">제목</th>
              <th className="px-2 py-2">상태</th>
              <th className="px-2 py-2 text-right">조회수</th>
              <th className="px-2 py-2">발행</th>
            </tr>
          </thead>
          <tbody>
            {[...posts]
              .sort((a, b) => b.viewCount - a.viewCount)
              .map((p) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="px-2 py-3 max-w-xs">
                    <a
                      href={`/write/${p.id}`}
                      className="block truncate text-gray-900 hover:underline"
                    >
                      {p.title}
                    </a>
                    <span className="block text-xs text-gray-400 font-mono">{p.slug}</span>
                  </td>
                  <td className="px-2 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-2 py-3 text-right font-mono">
                    {p.viewCount.toLocaleString()}
                  </td>
                  <td className="px-2 py-3 text-xs text-gray-500">
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
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
