"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileText, PenSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { listMyPosts, type PostStatus, type PostView } from "@/modules/blog/api/posts";
import { SkeletonRows } from "@/modules/blog/components/skeleton";

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["week", 604_800_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "3 hours ago" style, locale-aware — so the draft list reads as "what was I working on". */
function relativeTime(iso: string, locale: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms || unit === "minute") return rtf.format(Math.round(diff / ms), unit);
  }
  return rtf.format(0, "minute");
}

export default function WriteIndexPage() {
  const t = useTranslations("postEditor");
  const locale = useLocale();
  const { ready, authenticated } = useAuth();
  const [posts, setPosts] = useState<PostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Preserve the current path prefix (locale + /blog-preview on the apex) for intra-blog links —
  // a root-relative "/write/..." would drop the prefix and 404.
  const [writeBase, setWriteBase] = useState("/write");

  useEffect(() => {
    const i = window.location.pathname.indexOf("/write");
    if (i >= 0) setWriteBase(window.location.pathname.slice(0, i + "/write".length));
  }, []);

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

  if (!ready) return null;
  if (!authenticated) {
    return <main className="mx-auto max-w-2xl px-6 py-12 text-slate-600">{t("loginRequired")}</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("myPosts")}</h1>
        <a
          href={`${writeBase}/new`}
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700"
        >
          <PenSquare className="h-4 w-4" />
          {t("newPost")}
        </a>
      </header>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <SkeletonRows count={6} thumb />}
      {!loading && posts.length === 0 && <p className="text-slate-400">{t("noPosts")}</p>}
      {!loading && posts.length > 0 && (
        <ul className="space-y-1">
          {posts.map((p) => {
            const titled = p.title.trim();
            return (
              <li key={p.id}>
                <a
                  href={`${writeBase}/${p.id}`}
                  className="focus-ring group -mx-3 flex gap-3.5 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50"
                >
                  {p.ogImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.ogImageUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-300">
                      <FileText className="h-5 w-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      <span
                        className={`truncate text-[15px] font-semibold transition-colors group-hover:text-accent-700 ${
                          titled ? "text-slate-900" : "italic text-slate-400"
                        }`}
                      >
                        {titled || t("untitled")}
                      </span>
                    </div>
                    {p.excerpt && (
                      <p className="mt-1 line-clamp-1 text-[13px] leading-relaxed text-slate-500">
                        {p.excerpt}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-400">
                      <span>{relativeTime(p.updatedAt, locale)}</span>
                      {p.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500"
                        >
                          {tag}
                        </span>
                      ))}
                      <span className="ml-auto truncate font-mono text-slate-300">{p.slug}</span>
                    </div>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: PostStatus }) {
  const map: Record<PostStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-600",
    SCHEDULED: "bg-blue-100 text-blue-700",
    PUBLISHED: "bg-accent-100 text-accent-800",
    UNPUBLISHED: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status]}`}>{status}</span>
  );
}
