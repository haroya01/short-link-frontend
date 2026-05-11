"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ExternalLink } from "lucide-react";
import type { Oembed } from "@/types";
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
 * Tapping the card mounts the provider's iframe in place — deferred load keeps the profile feed
 * light (no third-party JS until the visitor opts in) and side-steps the privacy + LCP cost of
 * auto-embedding every block. On click we rewrite the iframe src to include the provider's
 * autoplay flag, so the visitor's one tap on our thumbnail starts playback immediately instead
 * of dropping them onto a second-tier "▶" inside the YouTube / Vimeo player. Each provider uses
 * a different param name, so {@link withAutoplay} dispatches on host.
 *
 * <p>While the oembed proxy is fetching, the card falls back to a bare host pill so it never
 * blanks out.
 */
export function EmbedEntryCard({ url, colors, fadeStyle }: Props) {
  const [meta, setMeta] = useState<Oembed | null>(null);
  const [active, setActive] = useState(false);

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

  if (active && meta?.html) {
    // Provider-authored iframe. Trusted because the backend only proxies whitelisted hosts
    // (YouTube/Vimeo/Spotify/SoundCloud); we render it raw so embeds keep working as providers
    // tweak attrs. The autoplay rewrite is purely a query-param swap on iframe src — doesn't
    // touch any other attribute or script.
    return (
      <li className="profile-fade" style={fadeStyle}>
        <div
          className={`overflow-hidden rounded-xl border ${colors.card} ${colors.cardBorder}`}
        >
          <div
            className="oembed-frame [&_iframe]:block [&_iframe]:aspect-video [&_iframe]:w-full"
            dangerouslySetInnerHTML={{ __html: withAutoplay(meta.html) }}
          />
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-sm font-medium ${colors.primary}`}>
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

  return (
    <li className="profile-fade" style={fadeStyle}>
      <button
        type="button"
        onClick={() => setActive(true)}
        className={`hover-lift group block w-full overflow-hidden rounded-xl border text-left ${colors.card} ${colors.cardBorder} ${colors.cardHover}`}
      >
        {meta?.thumbnailUrl ? (
          <div className="relative aspect-video w-full bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meta.thumbnailUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm">
                ▶
              </span>
            </span>
          </div>
        ) : (
          <div className="grid aspect-video w-full place-items-center bg-slate-100">
            <span className={`text-xs ${colors.muted}`}>{host}</span>
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-sm font-medium ${colors.primary}`}>
              {title}
            </span>
            <span className={`block truncate text-[11px] ${colors.muted}`}>{host}</span>
          </span>
          <ExternalLink className={`h-3.5 w-3.5 shrink-0 ${colors.muted}`} />
        </div>
      </button>
    </li>
  );
}

/**
 * Inject the provider's "autoplay" query param into the iframe src so the visitor's tap on our
 * thumbnail starts playback immediately. Each provider uses a different param name — wrong name
 * is a silent no-op, never an error. Spotify is intentionally skipped: their embed API ignores
 * autoplay for non-Premium-logged-in viewers and shows a single big play button anyway, so
 * adding the param adds nothing.
 *
 * <p>Only mutates iframe src attributes — script blocks and other tags pass through untouched.
 * The replacement is idempotent: if the param is already present we don't duplicate it.
 */
function withAutoplay(html: string): string {
  return html.replace(
    /<iframe([^>]*?)\ssrc="([^"]+)"([^>]*)>/gi,
    (_match, before, src, after) => {
      const next = injectAutoplay(src);
      return `<iframe${before} src="${next}"${after}>`;
    },
  );
}

function injectAutoplay(src: string): string {
  let host: string;
  try {
    host = new URL(src).host.toLowerCase();
  } catch {
    return src;
  }
  const param = autoplayParamFor(host);
  if (!param) return src;
  if (new RegExp(`[?&]${param.name}=`, "i").test(src)) return src;
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}${param.name}=${param.value}`;
}

function autoplayParamFor(host: string): { name: string; value: string } | null {
  if (host.endsWith("youtube.com") || host.endsWith("youtu.be"))
    return { name: "autoplay", value: "1" };
  if (host.endsWith("vimeo.com")) return { name: "autoplay", value: "1" };
  if (host.endsWith("soundcloud.com")) return { name: "auto_play", value: "true" };
  return null;
}
