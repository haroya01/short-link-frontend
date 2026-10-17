"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2, MoreHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useDismiss } from "@/hooks/use-dismiss";
import { useAuth } from "@/lib/auth";
import { blogPath } from "@/lib/host";
import { cn } from "@/lib/utils";
import type { Note } from "@/modules/notes/api/notes";
import { REMOTE_TRENDING_COLLAPSED, type TrendingNote } from "@/modules/notes/api/remote-trending";
import { noteVerdict, useNoteFilters } from "@/modules/notes/lib/note-filters";
import { openNote } from "@/modules/notes/lib/note-href";
import { useRemoteTrending, useTrendingNote } from "@/modules/notes/lib/use-remote-trending";
import { NOTE_ACTION, NoteCard } from "./note-card";
import { NoteGlyph } from "./note-glyph";
import { NoteListSkeleton } from "./note-list";
import { NoteReplyDialog } from "./note-reply-dialog";
import { webAddress } from "./note-remote-card";

const heading = "text-[13px] font-semibold text-slate-500 dark:text-slate-400";

function trendingDisplayNote(item: TrendingNote): Note {
  return {
    ...item,
    id: 0,
    author: { ...item.author, id: item.author.id ?? 0 },
    likeCount: null,
    likedByMe: null,
    repostCount: null,
    repostedByMe: null,
  };
}

export function RemoteTrendingGroup() {
  const t = useTranslations("notes");
  const tFeed = useTranslations("publicFeed");
  const headingId = useId();
  const trending = useRemoteTrending();
  const filters = useNoteFilters();
  const { me } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const firstRevealed = useRef<HTMLDivElement>(null);
  const shown = (trending.state === "ready" ? trending.items : [])
    .map((item) => ({ item, verdict: noteVerdict(trendingDisplayNote(item), filters, "public", me?.id) }))
    .filter(({ verdict }) => verdict?.action !== "hide");

  useEffect(() => {
    if (expanded) firstRevealed.current?.focus({ preventScroll: true });
  }, [expanded]);

  if (trending.state === "ready" && shown.length === 0) return null;
  const visible = expanded ? shown : shown.slice(0, REMOTE_TRENDING_COLLAPSED);

  return (
    <>
      <section
        aria-labelledby={headingId}
        data-testid="remote-trending"
        className="border-b border-slate-100 pt-4 dark:border-slate-800"
      >
        <h2 id={headingId} className={heading}>
          {tFeed("trending")}
        </h2>
        {trending.state === "loading" ? (
          <NoteListSkeleton rows={2} />
        ) : trending.state === "failed" ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 py-4 text-[14px] text-slate-500 dark:text-slate-400">
            <span>{t("trendingFailed")}</span>
            <button
              type="button"
              onClick={trending.retry}
              className="focus-ring rounded font-medium text-slate-900 hover:underline dark:text-slate-100"
            >
              {tFeed("retry")}
            </button>
          </p>
        ) : (
          <>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {visible.map(({ item, verdict }, index) => (
                <div
                  key={item.uri}
                  ref={index === REMOTE_TRENDING_COLLAPSED ? firstRevealed : undefined}
                  tabIndex={index === REMOTE_TRENDING_COLLAPSED ? -1 : undefined}
                  data-trending-uri={item.uri}
                  className={cn(
                    "outline-none",
                    index >= REMOTE_TRENDING_COLLAPSED && "animate-fade-in motion-reduce:animate-none",
                  )}
                >
                  <TrendingNoteCard item={item} filteredBy={verdict?.action === "warn" ? verdict.phrases : undefined} />
                </div>
              ))}
            </div>
            {!expanded && shown.length > REMOTE_TRENDING_COLLAPSED && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="focus-ring -mx-1 mb-2 block rounded px-1 py-2.5 text-[13px] font-medium text-slate-700 hover:underline dark:text-slate-300"
              >
                {t("trendingMore")}
              </button>
            )}
          </>
        )}
      </section>
      <h2 className={cn(heading, "pt-5")}>{t("receivedNotes")}</h2>
    </>
  );
}

function TrendingNoteCard({ item, filteredBy }: { item: TrendingNote; filteredBy?: string[] }) {
  const t = useTranslations("notes");
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const actions = useTrendingNote(item);
  const [replies, setReplies] = useState(item.replyCount);
  const [likeTouched, setLikeTouched] = useState(false);
  const note = useMemo(() => ({ ...trendingDisplayNote(item), replyCount: replies }), [item, replies]);
  const first = item.servers[0] ?? item.sourceHost;
  const others = item.servers.length - 1;
  const original = webAddress(item.url)?.href ?? null;

  return (
    <>
      <NoteCard
        note={note}
        filteredBy={filteredBy}
        context={
          <p className="-mt-1 mb-1.5 flex items-center gap-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">
            <span aria-hidden className="w-9 shrink-0" />
            <span className="truncate">
              {others > 0 ? t("trendingOnMore", { server: first, count: others }) : t("trendingOn", { server: first })}
            </span>
          </p>
        }
        detached={{
          authorHref: item.author.remoteId ? blogPath(`/remote/${item.author.remoteId}`) : null,
          onAuthor: () => void actions.openAuthor(),
          onOpen: () => void actions.open(),
          menu: <TrendingMenu original={original} onFollow={() => void actions.follow()} />,
          footer: (
            <>
              <button
                type="button"
                onClick={() => {
                  setLikeTouched(true);
                  void actions.like();
                }}
                aria-pressed={actions.liked}
                aria-label={actions.liked ? t("unlike") : t("like")}
                className={cn(NOTE_ACTION, actions.liked && "text-accent-700 dark:text-accent-400")}
              >
                <span key={actions.liked ? "on" : "off"} className={cn("inline-flex", likeTouched && "subscribe-pop")}>
                  <NoteGlyph
                    name="heart"
                    active={actions.liked}
                    className={cn("h-[18px] w-[18px]", actions.liked && "text-accent-600")}
                  />
                </span>
              </button>
              <button type="button" onClick={() => void actions.reply()} className={NOTE_ACTION}>
                <NoteGlyph name="reply" className="h-[18px] w-[18px]" />
                <span className="sr-only">{t("replyLabel")} </span>
                {replies > 0 && <span className="tabular-nums">{replies}</span>}
              </button>
              {actions.busy && (
                <Loader2
                  data-testid="trending-resolving"
                  className="ml-auto h-4 w-4 animate-spin text-slate-400 motion-reduce:animate-none"
                  aria-hidden
                />
              )}
            </>
          ),
        }}
      />
      <NoteReplyDialog
        target={actions.replyTarget}
        onClose={actions.closeReply}
        onReplied={(reply) => {
          actions.closeReply();
          setReplies((count) => count + 1);
          toast(t("replyPosted"), "default", {
            action: { label: t("view"), onClick: () => openNote(reply, locale, router.push) },
          });
        }}
      />
    </>
  );
}

function TrendingMenu({ original, onFollow }: { original: string | null; onFollow: () => void }) {
  const t = useTranslations("notes");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, root, () => setOpen(false));
  const item =
    "focus-ring block w-full rounded-surface px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={t("menu")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="touch-target rounded text-slate-500 transition-colors hover:text-slate-800 focus-ring dark:text-slate-400 dark:hover:text-slate-200"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-8 z-20 w-44 rounded-surface border border-slate-200 bg-white p-1 shadow-float dark:border-slate-800 dark:bg-slate-900"
        >
          {original && (
            <a
              href={original}
              target="_blank"
              rel="nofollow noopener ugc"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={item}
            >
              {t("remoteOpen")}
            </a>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onFollow();
            }}
            className={item}
          >
            {t("remoteFollow")}
          </button>
        </div>
      )}
    </div>
  );
}
