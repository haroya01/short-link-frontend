"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Top-of-editor link card showing the owner's public profile URL. Visually treated as a
 * miniature browser address bar — chrome-style left chip with the site favicon, monospaced
 * URL in the middle, and an "Open" CTA on the right. Reads as "this is where my page lives,
 * and that's the door to walk into it." The previous emerald-gradient banner felt too
 * decorative; this one stays out of the way visually while still being instantly clickable.
 */
export function ProfilePublicUrlBanner({ url }: { url: string }) {
  const t = useTranslations("settings.profile");
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* silent on insecure context */
    }
  }

  const display = url.replace(/^https?:\/\//, "");

  return (
    <div className="group flex items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:shadow-md">
      {/* Site chip — matches the kurl wordmark + favicon, gives the row a recognizable left edge */}
      <div className="flex items-center gap-2 border-r border-slate-200 bg-slate-50/60 px-3 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="h-4 w-4 shrink-0" />
      </div>

      {/* URL display — clickable, monospaced so the handle visually anchors. truncate keeps
          long handles from breaking layout on narrow viewports. */}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-400">
          {t("yourPage")}
        </span>
        <span className="truncate font-mono text-[13px] font-medium text-slate-900 group-hover:text-emerald-700">
          {display}
        </span>
      </a>

      {/* Right-side action cluster — copy + open. Open is the primary CTA in emerald so the
          action affordance is clear without overpowering the URL itself. */}
      <div className="flex items-center gap-1 px-2">
        <button
          type="button"
          onClick={copy}
          aria-label={t("copyPublicUrl")}
          title={t("copyPublicUrl")}
          className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
        >
          {t("openShort")}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
