"use client";

import { ArrowUpRight, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { PageLinkProvider } from "@/modules/notes/lib/page-link";
import { sameLink } from "@/modules/notes/lib/topics";
import { useTopicPosts } from "@/modules/notes/lib/use-topics";
import type { RemoteNotes } from "@/modules/notes/lib/use-remote-trending";
import { TopicPosts } from "./topic-posts";

function linkHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function isWebUrl(url: string): boolean {
  try {
    const protocol = new URL(url).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function previewTitle(notes: RemoteNotes, url: string): string | null {
  if (notes.state !== "ready") return null;
  for (const entry of notes.pages[0]?.items ?? []) {
    const preview = entry.kind === "pool" ? entry.item.linkPreview : entry.note.linkPreview;
    if (preview?.title && sameLink(preview.url, url)) return preview.title;
  }
  return null;
}

export function LinkedNotes({ url }: { url: string }) {
  const t = useTranslations("notes");
  const { notes, topic } = useTopicPosts({ url });
  const host = linkHost(url);
  const title = (topic?.kind === "link" ? topic.title : null) ?? previewTitle(notes, url);
  const heading = (
    <span className="min-w-0 flex-1">
      <span className="line-clamp-3 text-[17px] font-semibold text-slate-900 dark:text-slate-100">
        {title || host}
      </span>
      <span className="mt-0.5 block truncate text-[13px] text-slate-500 dark:text-slate-400">{host}</span>
    </span>
  );

  return (
    <div>
      <h1 className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{t("linkTitle")}</h1>
      {isWebUrl(url) ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          data-testid="linked-notes-link"
          className="focus-ring -mx-2 mt-2 flex items-start gap-3 rounded-surface px-2 py-3 hover:bg-slate-50 dark:hover:bg-slate-900"
        >
          <Link2 className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          {heading}
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        </a>
      ) : (
        <div className="mt-2 flex items-start gap-3 py-3">{heading}</div>
      )}
      <div className="border-t border-slate-100 dark:border-slate-800">
        <PageLinkProvider value={url}>
          <TopicPosts key={url} notes={notes} empty={<BlogEmpty title={t("emptyLink")} />} />
        </PageLinkProvider>
      </div>
    </div>
  );
}
