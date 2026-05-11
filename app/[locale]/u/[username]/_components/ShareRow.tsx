"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import type { ShareChannel } from "@/types";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  url: string;
  username: string;
  colors: ThemeColors;
  /** Channels the profile owner enabled in the editor, in their chosen order. */
  channels: ShareChannel[];
  labels: {
    /**
     * Per-channel aria-label, pre-resolved server-side. Has to be a plain Record (not a function)
     * because server components can't serialize functions to client components — Next.js rejects
     * any function in a client component's props at SSR.
     */
    shareOn: Record<ShareChannel, string>;
    shareMore: string;
    copy: string;
    copied: string;
  };
};

/**
 * Visitor-facing share row. The branded channels (X / LINE / Threads / Facebook / KakaoTalk) are
 * opt-in per profile owner — if they didn't enable any, only Copy + (mobile) native share appear.
 * Caps at 2 explicit channels for visual balance + to avoid the "20 social buttons" Linktree look.
 */
export function ShareRow({ url, username, colors, channels, labels }: Props) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const shareText = `@${username} · kurl`;

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

  const buttonClass = `inline-flex h-9 w-9 items-center justify-center rounded-full border ${colors.cardBorder} ${colors.card} ${colors.cardHover} transition-colors`;

  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      {channels.map((ch) => (
        <a
          key={ch}
          href={channelIntent(ch, url, shareText)}
          target="_blank"
          rel="noreferrer"
          aria-label={labels.shareOn[ch]}
          title={labels.shareOn[ch]}
          className={buttonClass}
        >
          <ChannelIcon channel={ch} className={`h-3.5 w-3.5 ${colors.muted}`} />
        </a>
      ))}
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

/**
 * Direct intent URL per channel. All work without SDK / API keys — they're the same URLs the
 * native "share to" buttons across the web use.
 */
function channelIntent(channel: ShareChannel, url: string, text: string): string {
  switch (channel) {
    case "x":
      return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    case "line":
      return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
    case "threads":
      return `https://www.threads.net/intent/post?text=${encodeURIComponent(text + " " + url)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    case "kakao":
      // KakaoTalk web share without an app key — open Kakao web with the URL as redirect target.
      // Real KakaoTalk integration would need a Kakao Developers app + JS SDK.
      return `https://kakaocorp.com/page/redirect?url=${encodeURIComponent(url)}`;
  }
}

export function ChannelIcon({
  channel,
  className,
}: {
  channel: ShareChannel;
  className?: string;
}) {
  switch (channel) {
    case "x":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "line":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.628-.63.628h-2.386c-.345 0-.627-.282-.627-.628V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596a.65.65 0 0 1-.69-.183l-2.443-3.317v2.85c0 .345-.282.63-.633.63-.345 0-.627-.285-.627-.63V8.108c0-.27.174-.513.432-.596a.66.66 0 0 1 .69.183l2.45 3.328V8.108c0-.345.282-.63.63-.63s.63.285.63.63v4.771zm-5.741 0c0 .345-.282.63-.633.63-.345 0-.627-.285-.627-.63V8.108c0-.345.282-.63.63-.63s.63.285.63.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.63V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .63.283.63.63 0 .344-.282.629-.63.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
      );
    case "threads":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.32.143 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z" />
        </svg>
      );
    case "facebook":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
        </svg>
      );
    case "kakao":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.755 1.808 5.169 4.526 6.586l-1.06 3.872c-.094.344.295.617.59.422l4.638-3.062c.428.058.86.097 1.306.097 5.523 0 10-3.477 10-7.915C22 6.477 17.523 3 12 3z" />
        </svg>
      );
  }
}
