"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SeriesPostRef } from "@/modules/blog/api/public-posts";
import { postHref } from "@/modules/blog/components/feed-card";

// How long each episode holds the spotlight before it moves to the next (1 → 2 → 3 → loop).
const CYCLE_MS = 2200;

/**
 * The series card's member list, with a slow rotating spotlight: every {@link CYCLE_MS} the emphasis
 * (bold + accent dot, eased) steps to the next episode and loops, so the card quietly previews each
 * post in turn. Each title still links straight to its post. Reduced-motion holds on the first item.
 */
export function SeriesEpisodeList({
  authorUsername,
  locale,
  posts,
  postCount,
  seriesUrl,
}: {
  authorUsername: string;
  locale: string;
  posts: SeriesPostRef[];
  postCount: number;
  seriesUrl: string;
}) {
  const t = useTranslations("publicFeed");
  const more = postCount - posts.length;
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (posts.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(
      () => setActive((a) => (a + 1) % posts.length),
      CYCLE_MS,
    );
    return () => window.clearInterval(id);
  }, [posts.length]);

  return (
    <ol className="mt-2 flex flex-col">
      {posts.map((post, i) => {
        const on = i === active;
        return (
          <li
            key={post.slug}
            className="profile-fade"
            style={{ ["--idx" as string]: i } as React.CSSProperties}
          >
            <a
              href={postHref(authorUsername, post.slug, locale)}
              className="group/ep focus-ring -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-500 ${
                  on
                    ? "scale-125 bg-accent-500 dark:bg-accent-400"
                    : "bg-accent-300 dark:bg-accent-500/40"
                }`}
              />
              <span
                className={`truncate text-[14px] transition-all duration-500 group-hover/ep:text-accent-700 dark:group-hover/ep:text-accent-300 ${
                  on
                    ? "font-bold text-slate-900 dark:text-slate-50"
                    : "font-medium text-slate-600 dark:text-slate-400"
                }`}
              >
                {post.title}
              </span>
            </a>
          </li>
        );
      })}
      {more > 0 && (
        <li
          className="profile-fade"
          style={{ ["--idx" as string]: posts.length } as React.CSSProperties}
        >
          <a
            href={seriesUrl}
            className="group/ep focus-ring -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1 text-[13px] text-slate-400 transition-colors hover:text-accent-700 dark:text-slate-500 dark:hover:text-accent-300"
          >
            <span aria-hidden className="h-1.5 w-1.5 shrink-0" />
            <span>{t("seriesMoreCount", { count: more })}</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover/ep:translate-x-0.5 motion-reduce:transform-none" />
          </a>
        </li>
      )}
    </ol>
  );
}
