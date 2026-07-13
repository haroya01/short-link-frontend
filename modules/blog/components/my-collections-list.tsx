"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CornerDownRight, Globe, Link as LinkIcon, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { blogPath } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { listMyCollections, type CollectionSummary } from "@/modules/blog/api/collections";

/**
 * 내 컬렉션 — the viewer's own collections and paths (private ones included), the reader-side twin of
 * the discover feed. Each row links to the existing collection detail; a PATH is marked with the path
 * arrow. Fetched client-side with the viewer's token (no block context, so no membership enrichment —
 * just the plain list). Empty state is a quiet nudge into reading, where a first collection begins.
 */
export function MyCollectionsList() {
  const t = useTranslations("collections");
  const { ready, authenticated } = useAuth();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [collections, setCollections] = useState<CollectionSummary[]>([]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let alive = true;
    setState("loading");
    listMyCollections()
      .then((list) => {
        if (!alive) return;
        setCollections(list);
        setState("ready");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [ready, authenticated]);

  if (!ready) return null;
  if (!authenticated) {
    return (
      <p className="py-16 text-center text-[14px] text-slate-500 dark:text-slate-400">
        {t("myCollectionsEmptyBody")}
      </p>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex justify-center py-16 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <p className="py-16 text-center text-[14px] text-slate-500 dark:text-slate-400">
        {t("myCollectionsLoadError")}
      </p>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[15px] font-medium text-slate-700 dark:text-slate-200">
          {t("myCollectionsEmptyTitle")}
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t("myCollectionsEmptyBody")}
        </p>
        <BlogLink
          href={blogPath("/")}
          className="focus-ring mt-5 inline-flex rounded-full bg-accent-700 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-800"
        >
          {t("myCollectionsEmptyCta")}
        </BlogLink>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {collections.map((c) => (
        <li key={c.id}>
          <BlogLink
            href={blogPath(`/collections/${c.id}`)}
            className="focus-ring flex items-start gap-3 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium text-slate-900 dark:text-slate-100">
                {c.title}
              </span>
              {c.preview.length > 0 && (
                <span className="mt-0.5 block truncate text-[13px] text-slate-500 dark:text-slate-400">
                  {c.preview.join(" · ")}
                </span>
              )}
              <span className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
                {c.kind === "PATH" && (
                  <>
                    <CornerDownRight className="h-3 w-3 text-accent-600 dark:text-accent-500" />
                    <span className="text-accent-700 dark:text-accent-400">{t("kindPath")}</span>
                    <span aria-hidden>·</span>
                  </>
                )}
                <VisibilityGlyph visibility={c.visibility} />
                <span>{t("itemCount", { count: c.count })}</span>
              </span>
            </span>
          </BlogLink>
        </li>
      ))}
    </ul>
  );
}

function VisibilityGlyph({ visibility }: { visibility: CollectionSummary["visibility"] }) {
  const cls = "h-3.5 w-3.5 shrink-0";
  if (visibility === "PUBLIC") return <Globe className={cls} />;
  if (visibility === "UNLISTED") return <LinkIcon className={cls} />;
  return <Lock className={cls} />;
}
