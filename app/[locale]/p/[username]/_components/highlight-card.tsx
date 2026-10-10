"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronRight, FolderPlus, Globe, MessageCircle, Share2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/modules/blog/components/avatar";
import type { HighlightView } from "@/modules/blog/api/highlights";
import { markdownPlain } from "@/modules/blog/lib/markdown-lead";

const GAP = 10;
const EDGE = 16;
const MAX_WIDTH = 360;

export function hasConversation(h: HighlightView): boolean {
  return !!h.note?.trim() || h.replyCount > 0;
}

export function HighlightCard({
  highlights,
  meId,
  anchor,
  canConnect,
  onOpen,
  onShare,
  onConnect,
  onRemove,
  onClose,
}: {
  highlights: HighlightView[];
  meId: number | null;
  anchor: DOMRect;
  canConnect: boolean;
  onOpen: (highlight: HighlightView) => void;
  onShare: (highlight: HighlightView) => void;
  onConnect: (highlight: HighlightView) => void;
  onRemove: (highlight: HighlightView) => void;
  onClose: () => void;
}) {
  const t = useTranslations("publicPost");
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  const isMine = (h: HighlightView) => meId != null && h.author?.id === meId;
  const ordered = [...highlights].sort(
    (a, b) =>
      (isMine(a) ? 0 : 2) + (hasConversation(a) ? 0 : 1) - ((isMine(b) ? 0 : 2) + (hasConversation(b) ? 0 : 1)),
  );
  const mine = ordered.find(isMine) ?? null;
  const lead = mine ?? ordered[0];
  const conversations = ordered.filter(hasConversation).slice(0, 2);
  const readers = ordered
    .filter((h) => !isMine(h) && h.author)
    .map((h) => h.author!)
    .filter((a, i, all) => all.findIndex((x) => x.id === a.id) === i);

  const summary = mine
    ? readers.length === 0
      ? t("highlightCardMine")
      : t("highlightCardMineAndOthers", { count: readers.length })
    : readers.length === 1
      ? t("highlightCardOne", { name: readers[0].username })
      : t("highlightCardMany", { count: readers.length });

  useLayoutEffect(() => {
    if (ref.current) setHeight(ref.current.offsetHeight);
  }, [highlights]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    ref.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [onClose]);

  const viewport = typeof window === "undefined" ? 1024 : window.innerWidth;
  const width = Math.min(viewport - EDGE * 2, MAX_WIDTH);
  const left = Math.min(Math.max(anchor.left + anchor.width / 2 - width / 2, EDGE), viewport - EDGE - width);
  const top = anchor.top - GAP - height > EDGE ? anchor.top - GAP - height : anchor.bottom + GAP;

  return (
    <div className="fixed inset-0 z-[55]" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-label={summary}
        data-testid="highlight-card"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ left, top, width, visibility: height ? "visible" : "hidden" }}
        className="absolute rounded-surface border border-slate-200 bg-white p-4 shadow-modal motion-safe:animate-dropdown-in dark:border-slate-800 dark:bg-slate-850"
      >
        <div className="flex items-center gap-2">
          {readers.length > 0 && (
            <span className="flex -space-x-1.5" aria-hidden>
              {readers.slice(0, 3).map((a) => (
                <span key={a.id} className="rounded-full ring-2 ring-white dark:ring-slate-850">
                  <Avatar src={a.avatarUrl} name={a.username} size="xs" />
                </span>
              ))}
            </span>
          )}
          <span className="flex-1 text-[13px] text-slate-500 dark:text-slate-400">{summary}</span>
          <Globe className="h-3.5 w-3.5 text-slate-400" aria-label={t("highlightCardPublic")} />
        </div>

        <div className="mt-3">
          {conversations.length === 0 ? (
            <button
              type="button"
              data-testid="highlight-card-talk"
              onClick={() => onOpen(lead)}
              className="focus-ring inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-accent-700 hover:underline dark:text-accent-400"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              {t("highlightCardTalk")}
            </button>
          ) : (
            <ul className="space-y-2.5">
              {conversations.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    data-testid={`highlight-card-conversation-${h.id}`}
                    onClick={() => onOpen(h)}
                    className="focus-ring block w-full rounded text-left"
                  >
                    {h.note?.trim() && (
                      <span className="line-clamp-2 text-[14px] leading-relaxed text-slate-800 dark:text-slate-100">
                        {markdownPlain(h.note)}
                      </span>
                    )}
                    <span className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold">{isMine(h) ? t("highlightCardMe") : h.author?.username}</span>
                      {h.replyCount > 0 && <span>{t("highlightCardReplies", { count: h.replyCount })}</span>}
                      <span className="ml-auto inline-flex items-center gap-0.5 text-accent-700 dark:text-accent-400">
                        {t("highlightCardView")}
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-200">
          {lead.id > 0 && (
            <button type="button" onClick={() => onShare(lead)} className="focus-ring inline-flex items-center gap-1.5 rounded hover:text-accent-700 dark:hover:text-accent-400">
              <Share2 className="h-3.5 w-3.5" aria-hidden />
              {t("highlightCardShare")}
            </button>
          )}
          {canConnect && lead.id > 0 && (
            <button type="button" onClick={() => onConnect(lead)} className="focus-ring inline-flex items-center gap-1.5 rounded hover:text-accent-700 dark:hover:text-accent-400">
              <FolderPlus className="h-3.5 w-3.5" aria-hidden />
              {t("highlightCardConnect")}
            </button>
          )}
          {mine && (
            <button
              type="button"
              data-testid="highlight-card-remove"
              onClick={() => onRemove(mine)}
              aria-label={t("highlightDelete")}
              className="focus-ring ml-auto inline-flex items-center gap-1.5 rounded text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {t("highlightCardRemove")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
