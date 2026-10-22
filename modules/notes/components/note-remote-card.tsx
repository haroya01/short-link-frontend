"use client";

import { useId } from "react";
import { Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { contentLang } from "@/modules/blog/lib/content-lang";
import type { Note, NoteMedia, RemoteNoteShape } from "@/modules/notes/api/notes";
import { textWithoutCardedLink } from "@/modules/notes/lib/note-text";

export function remoteCardOf(note: Note): RemoteNoteShape | null {
  const kind = note.remote?.kind;
  return kind === "ARTICLE" || kind === "PAGE" || kind === "VIDEO" ? note.remote! : null;
}

export function webAddress(url: string | null | undefined): { href: string; host: string } | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return { href: parsed.href, host: parsed.hostname.replace(/^www\./, "") };
  } catch {
    return null;
  }
}

export function NoteRemoteCard({
  shape,
  summary: body,
  picture,
  language,
  full = false,
  cardUrl,
}: {
  shape: RemoteNoteShape;
  summary: string;
  picture: NoteMedia | null;
  language?: string | null;
  full?: boolean;
  cardUrl?: string | null;
}) {
  const t = useTranslations("notes");
  const summaryId = useId();
  const summary = textWithoutCardedLink(body, cardUrl);
  const address = webAddress(shape.url);
  const video = shape.kind === "VIDEO";
  const frame = "mt-1.5 block overflow-hidden rounded-surface border border-slate-200 dark:border-slate-800";
  const content = (
    <>
      {picture && (
        <span
          className={cn(
            "relative block border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900",
            video ? "aspect-video" : "aspect-[1.91/1]",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={picture.url}
            alt={picture.altText ?? ""}
            loading="lazy"
            className="block h-full w-full object-cover"
          />
          {video && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span
                role="img"
                aria-label={t("remoteVideo")}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950/70 text-white"
              >
                <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden />
              </span>
            </span>
          )}
        </span>
      )}
      <span className="block px-3.5 py-3">
        {shape.community && (
          <span className="block truncate text-[13px] text-slate-500 dark:text-slate-400" data-remote-community>
            {shape.community}
          </span>
        )}
        {shape.title && (
          <span
            lang={contentLang(shape.title, language)}
            className={cn(
              "block break-words font-semibold leading-snug text-slate-900 dark:text-slate-100",
              full ? "text-[17px]" : "text-[15px]",
              !full && "line-clamp-2",
              shape.community && "mt-0.5",
            )}
          >
            {shape.title}
          </span>
        )}
        {summary && (
          <span
            id={summaryId}
            lang={contentLang(body, language)}
            className={cn(
              "block whitespace-pre-wrap break-words leading-[1.45] text-slate-600 dark:text-slate-300",
              full ? "text-[15px]" : "text-[14px] line-clamp-3",
              (shape.title || shape.community) && "mt-1",
            )}
          >
            {summary}
          </span>
        )}
        {address && (
          <span className="mt-2 flex min-w-0 items-baseline gap-1.5 text-[13px]">
            <span className="shrink-0 font-medium text-slate-900 dark:text-slate-100">{t("remoteOpen")}</span>
            <span aria-hidden className="shrink-0 text-slate-400 dark:text-slate-500">
              ·
            </span>
            <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">{address.host}</span>
            <span aria-hidden className="shrink-0 text-slate-500 dark:text-slate-400">
              →
            </span>
          </span>
        )}
      </span>
    </>
  );
  if (!address) {
    return (
      <div className={frame} data-remote-card={shape.kind}>
        {content}
      </div>
    );
  }
  return (
    <a
      href={address.href}
      target="_blank"
      rel="nofollow noopener ugc"
      onClick={(e) => e.stopPropagation()}
      aria-label={
        shape.title
          ? t("remoteOpenLabel", { title: shape.title, host: address.host })
          : t("remoteOpenHost", { host: address.host })
      }
      aria-describedby={summary ? summaryId : undefined}
      data-remote-card={shape.kind}
      className={`focus-ring ${frame} transition-colors hover:bg-slate-50 dark:hover:bg-slate-900`}
    >
      {content}
    </a>
  );
}
