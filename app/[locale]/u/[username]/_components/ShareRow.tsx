"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  url: string;
  username: string;
  colors: ThemeColors;
  labels: {
    shareOnX: string;
    shareOnLine: string;
    shareMore: string;
    copy: string;
    copied: string;
  };
};

/**
 * Visitor-facing share row at the bottom of the public profile. X + LINE work via direct
 * intent URLs (no API keys); the generic "more" button opens {@code navigator.share} when
 * available — on mobile this surfaces the OS share sheet which usually includes KakaoTalk
 * + every other installed messenger. Copy is the universal fallback.
 */
export function ShareRow({ url, username, colors, labels }: Props) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const shareText = `@${username} · kurl`;
  const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable on http or older Safari — silently no-op */
    }
  }

  function nativeShare() {
    if (typeof navigator === "undefined" || !navigator.share) return;
    void navigator.share({ title: shareText, url }).catch(() => {});
  }

  const buttonClass = `inline-flex h-9 w-9 items-center justify-center rounded-full border ${colors.cardBorder} ${colors.card} ${colors.cardHover} transition`;

  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <a
        href={xUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={labels.shareOnX}
        title={labels.shareOnX}
        className={buttonClass}
      >
        <XIcon className={`h-3.5 w-3.5 ${colors.muted}`} />
      </a>
      <a
        href={lineUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={labels.shareOnLine}
        title={labels.shareOnLine}
        className={buttonClass}
      >
        <LineIcon className={`h-4 w-4 ${colors.muted}`} />
      </a>
      {canShare && (
        <button
          type="button"
          onClick={nativeShare}
          aria-label={labels.shareMore}
          title={labels.shareMore}
          className={buttonClass}
        >
          <Share2 className={`h-3.5 w-3.5 ${colors.muted}`} />
        </button>
      )}
      <button
        type="button"
        onClick={copyUrl}
        aria-label={copied ? labels.copied : labels.copy}
        title={copied ? labels.copied : labels.copy}
        className={buttonClass}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Copy className={`h-3.5 w-3.5 ${colors.muted}`} />
        )}
      </button>
    </div>
  );
}

/** Inline SVG for X — no Lucide equivalent, simple monogram. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Inline SVG for LINE — simple monochrome glyph. */
function LineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.628-.63.628h-2.386c-.345 0-.627-.282-.627-.628V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596a.65.65 0 0 1-.69-.183l-2.443-3.317v2.85c0 .345-.282.63-.633.63-.345 0-.627-.285-.627-.63V8.108c0-.27.174-.513.432-.596a.66.66 0 0 1 .69.183l2.45 3.328V8.108c0-.345.282-.63.63-.63s.63.285.63.63v4.771zm-5.741 0c0 .345-.282.63-.633.63-.345 0-.627-.285-.627-.63V8.108c0-.345.282-.63.63-.63s.63.285.63.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.63V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .63.283.63.63 0 .344-.282.629-.63.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}
