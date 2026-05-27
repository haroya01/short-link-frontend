"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ExternalLink, Play } from "lucide-react";
import type { Oembed } from "@/types";
import { sanitizeOembedHtml } from "@/lib/embed-autoplay";
import type { ThemeColors } from "../_lib/theme";
import { hostOf } from "../_lib/url-helpers";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

type Props = {
  url: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * Renders an oembed-able URL (YouTube / Vimeo / Spotify / SoundCloud) as a thumbnail card.
 * Tapping the play overlay mounts the provider's iframe in the *same* absolute slot — the card
 * wrapper, aspect-ratio container, and meta strip stay structurally identical between the two
 * states. Earlier the inactive card was a `<button>` with `.hover-lift` and the active card was a
 * `<div>` without it, so a hover-lifted card snapped back down on click (transition-all kicked in)
 * and the inner element type swapped at the same time — visible as the "카드 크기가 변하면서"
 * judder. Now hover-lift lives on the play button only; once clicked it unmounts and the iframe
 * takes its absolute slot. The thumbnail sits underneath as a backdrop so the iframe's loading
 * frames don't expose a blank flash.
 *
 * <p>On click we rewrite the iframe src to include the provider's autoplay flag, so the visitor's
 * one tap on our thumbnail starts playback immediately instead of dropping them onto a second-tier
 * "▶" inside the YouTube / Vimeo player. Each provider uses a different param name, so
 * {@link sanitizeOembedHtml} dispatches on host and drops everything except a safe iframe.
 */
export function EmbedEntryCard({ url, colors, fadeStyle }: Props) {
  const [meta, setMeta] = useState<Oembed | null>(null);
  const [active, setActive] = useState(false);
  const safeHtml = meta?.html ? sanitizeOembedHtml(meta.html) : "";

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/v1/public/oembed?url=${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Oembed | null) => {
        if (!cancelled && data) setMeta(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);

  const host = hostOf(url);
  const title = meta?.title ?? host;

  return (
    <li className="profile-fade" style={fadeStyle}>
      <div
        className={`profile-card-static overflow-hidden ${colors.card} ${colors.cardBorder}`}
      >
        <div className="relative aspect-video w-full bg-slate-100">
          {meta?.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={meta.thumbnailUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <span className={`text-xs ${colors.muted}`}>{host}</span>
            </div>
          )}
          {active && safeHtml ? (
            <div
              className="oembed-frame absolute inset-0 [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:block [&_iframe]:h-full [&_iframe]:w-full"
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setActive(true)}
              aria-label={title}
              className="absolute inset-0 grid place-items-center bg-black/0 transition-colors hover:bg-black/10"
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm transition-transform duration-150 will-change-transform hover:scale-110">
                <Play className="h-6 w-6 translate-x-[1px] fill-current" />
              </span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-[15px] font-semibold ${colors.primary}`}>
              {title}
            </span>
            <span className={`block truncate text-[11px] ${colors.muted}`}>{host}</span>
          </span>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={host}
            className={colors.muted}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </li>
  );
}
