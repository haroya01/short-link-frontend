"use client";

import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Link2, MapPin, X } from "lucide-react";
import { getLinkPreview, type LinkPreview } from "@/modules/blog/api/public-posts";
import { planEmbed } from "@/modules/blog/lib/post-embed";
import { kurlNoteId } from "@/modules/blog/lib/kurl-link";
import { getNoteThread, isShareable, type Note } from "@/modules/notes/api/notes";
import { QuotedNoteCard } from "@/modules/notes/components/quoted-note-card";
import { staticMapUrl } from "@/modules/profile/lib/google-maps-static";
import { LinkCardBase } from "@/modules/blog/components/editor/link-card-base";

/**
 * Live link-preview card block — the editor counterpart to the published post's LinkPreviewCard.
 * Picking 카드 (the paste chip or the link sheet) inserts this; it fetches the OG preview (same
 * endpoint) and draws the card right in the editor.
 */
export const LinkCardNode = LinkCardBase.extend({
  addNodeView() {
    return ReactNodeViewRenderer(LinkCardView);
  },
});

function RemoveCardButton({ onRemove, label }: { onRemove: () => void; label: string }) {
  return (
    <button
      type="button"
      contentEditable={false}
      onClick={() => onRemove()}
      aria-label={label}
      className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-slate-400 opacity-0 shadow-sm backdrop-blur transition-opacity hover:text-red-600 group-hover/lc:opacity-100 dark:bg-slate-900/80 dark:hover:text-red-400"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function LinkCardView(props: NodeViewProps) {
  const url = (props.node.attrs.url as string) || "";
  const noteId = kurlNoteId(url);
  return noteId ? <NoteCardView {...props} noteId={noteId} /> : <PreviewCardView {...props} />;
}

/** Mirrors the reader's NoteEmbed: readers fetch the note anonymously, so a note only some may see
 *  shows here as the link card they will get. */
function NoteCardView(props: NodeViewProps & { noteId: number }) {
  const { node, deleteNode, selected, noteId } = props;
  const t = useTranslations("postEditor.blockMenu");
  const url = (node.attrs.url as string) || "";
  const [note, setNote] = useState<Note | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    getNoteThread(noteId)
      .then((thread) => alive && setNote(isShareable(thread.note.visibility) ? thread.note : null))
      .catch(() => alive && setNote(null));
    return () => {
      alive = false;
    };
  }, [noteId]);

  if (note === null) return <PreviewCardView {...props} />;
  return (
    <NodeViewWrapper
      className={`group/lc relative my-4 ${selected ? "ring-2 ring-accent-400 rounded-2xl" : ""}`}
      data-link-card=""
      data-url={url}
    >
      <div contentEditable={false} data-note-embed={noteId}>
        {note ? (
          <QuotedNoteCard note={note} linked={false} full />
        ) : (
          <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
        )}
      </div>
      <RemoveCardButton onRemove={deleteNode} label={t("delete")} />
    </NodeViewWrapper>
  );
}

export function LinkCardBody({ url, onPreview }: { url: string; onPreview?: (state: "loading" | "ready" | "failed") => void }) {
  const t = useTranslations("postEditor.blockMenu");
  const [data, setData] = useState<LinkPreview | null>(null);
  const [loaded, setLoaded] = useState(false);
  const host = hostOf(url);
  // Mirror the READER: video → iframe, map → static map, everything else → OG card. The editor used to
  // show a generic OG card for ALL embeds, so what the author saw didn't match the published page.
  const plan = planEmbed(url);
  const isMedia = plan?.kind === "video" || plan?.kind === "map";

  const onPreviewRef = useRef(onPreview);
  onPreviewRef.current = onPreview;

  useEffect(() => {
    if (isMedia) {
      onPreviewRef.current?.("ready");
      return; // video/map render directly — no OG-preview fetch needed
    }
    let alive = true;
    setLoaded(false);
    onPreviewRef.current?.("loading");
    getLinkPreview(url)
      .then((r) => {
        if (!alive) return;
        const preview = r.ok ? r.data : null;
        setData(preview);
        onPreviewRef.current?.(preview && (preview.title || preview.image) ? "ready" : "failed");
      })
      .catch(() => alive && onPreviewRef.current?.("failed"))
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [url, isMedia]);

  const rich = data && (data.title || data.image);

  if (plan && isMedia) {
    const mapImg = plan.kind === "map" ? staticMapUrl({ lat: plan.lat, lng: plan.lng, size: "640x360" }) : null;
    return plan.kind === "video" ? (
      <div className="overflow-hidden rounded-2xl bg-slate-900" contentEditable={false}>
        <div className="relative aspect-video">
          <iframe
            src={plan.src}
            title={t("embedMedia")}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>
    ) : (
      <div contentEditable={false} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
        {mapImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mapImg} alt={(plan.kind === "map" && plan.label) || "Google Maps"} className="aspect-[16/9] w-full bg-slate-100 object-cover dark:bg-slate-800" />
        ) : (
          <div className="grid aspect-[16/9] w-full place-items-center bg-slate-100 text-slate-400 dark:bg-slate-800">
            <MapPin className="h-8 w-8" />
          </div>
        )}
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      contentEditable={false}
      // Clicking inside the editor places the cursor (drag handle / backspace remove it); open in a
      // new tab only on real click without modifying the doc.
      onClick={(e) => e.preventDefault()}
      className="flex overflow-hidden rounded-2xl border border-slate-200 !no-underline transition-colors hover:border-accent-300 dark:border-slate-700 dark:hover:border-accent-500/50 [&_*]:!no-underline"
    >
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4">
        {!loaded ? (
          <>
            <span className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <span className="h-3 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </>
        ) : (
          <>
            <span className="line-clamp-2 text-[15px] font-semibold text-slate-900 dark:text-slate-100">
              {(rich && data?.title) || host}
            </span>
            {rich && data?.description && (
              <span className="line-clamp-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                {data.description}
              </span>
            )}
            <span className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-slate-500 dark:text-slate-400">
              {rich ? <ArrowUpRight className="h-3 w-3 shrink-0 text-accent-600" /> : <Link2 className="h-3 w-3 shrink-0 text-accent-600" />}
              {host}
            </span>
          </>
        )}
      </span>
      {rich && data?.image && (
        <span className="hidden w-32 shrink-0 self-stretch bg-slate-100 dark:bg-slate-800 sm:block sm:w-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.image} alt="" className="h-full w-full object-cover" />
        </span>
      )}
    </a>
  );
}

function PreviewCardView({ node, deleteNode, selected }: NodeViewProps) {
  const t = useTranslations("postEditor.blockMenu");
  const url = (node.attrs.url as string) || "";
  return (
    <NodeViewWrapper
      className={`group/lc relative my-4 ${selected ? "ring-2 ring-accent-400 rounded-2xl" : ""}`}
      data-link-card=""
      data-url={url}
    >
      <LinkCardBody url={url} />
      {/* Remove — visible on hover; atoms also delete with Backspace when selected. */}
      <RemoveCardButton onRemove={deleteNode} label={t("delete")} />
    </NodeViewWrapper>
  );
}
