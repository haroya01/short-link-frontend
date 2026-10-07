"use client";

import { useCallback, useState } from "react";
import { ArrowUpRight, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/common/empty-state";
import { listLinkedNotes, type NoteLinkPreview } from "@/modules/notes/api/notes";
import { NoteList } from "./note-list";
import { linkHost } from "./trending-note-links";

function isWebUrl(url: string): boolean {
  try {
    const protocol = new URL(url).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

export function LinkedNotes({ url }: { url: string }) {
  const t = useTranslations("notes");
  const [preview, setPreview] = useState<NoteLinkPreview | null>(null);
  const load = useCallback(
    async (page: number) => {
      const feed = await listLinkedNotes(url, page);
      if (page === 0) setPreview(feed.items.find((n) => n.linkPreview?.url === url)?.linkPreview ?? null);
      return feed;
    },
    [url],
  );
  const host = linkHost(url);
  const heading = (
    <span className="min-w-0 flex-1">
      <span className="line-clamp-3 text-[17px] font-semibold text-slate-900 dark:text-slate-100">
        {preview?.title || host}
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
          className="focus-ring -mx-2 mt-2 flex items-start gap-3 rounded-lg px-2 py-3 hover:bg-slate-50 dark:hover:bg-slate-900"
        >
          <Link2 className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          {heading}
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        </a>
      ) : (
        <div className="mt-2 flex items-start gap-3 py-3">{heading}</div>
      )}
      <div className="border-t border-slate-100 dark:border-slate-800">
        <NoteList
          key={url}
          load={load}
          filterContext="public"
          empty={<EmptyState title={t("emptyLink")} className="mt-8" />}
        />
      </div>
    </div>
  );
}
