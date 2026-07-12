"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { QrButton } from "@/components/links/qr/button";

/**
 * Top-of-editor link card showing the owner's public profile URL. Visually treated as a
 * miniature browser address bar — chrome-style left chip with the site favicon, monospaced
 * URL in the middle, and an "Open" CTA on the right. Reads as "this is where my page lives,
 * and that's the door to walk into it." The previous emerald-gradient banner felt too
 * decorative; this one stays out of the way visually while still being instantly clickable.
 *
 * <p>Also hosts the QR share affordance — it used to sit standalone at the bottom of the meta
 * form, where new users didn't connect it to the same "share my page" idea this banner already
 * communicates. Co-locating means the share surface is one row instead of two and QR reads as a
 * secondary form of "open / copy".
 */
export function ProfilePublicUrlBanner({
  url,
  username,
}: {
  url: string;
  username?: string;
}) {
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
        <span className="text-[10px] font-medium text-slate-500">
          {t("yourPage")}
        </span>
        <span className="truncate font-mono text-[13px] font-medium text-slate-900 group-hover:text-emerald-700">
          {display}
        </span>
      </a>

      {/* Right-side action cluster — copy + QR + open. Open is the primary CTA in emerald so
          the action affordance is clear without overpowering the URL itself. QR is the small
          icon button between copy and Open so it reads as "another share format" rather than
          a standalone block. */}
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
        {username && (
          <QrButton
            url={url}
            filename={`${username}.png`}
            logoSrc="/icon.svg"
            showSrcInput={false}
            defaultSrcHint="profile"
            iconOnly
          />
        )}
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
