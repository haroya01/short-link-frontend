"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  buildAuthorShareUrl,
  buildSharePlatformIntent,
  type SharePlatform,
} from "@/modules/blog/lib/publishing-share";

type Props = {
  postUrl: string;
  postSlug: string;
  postTitle: string;
};

const PLATFORMS: { id: SharePlatform; label: string }[] = [
  { id: "twitter", label: "Twitter / X" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "line", label: "LINE" },
];

export function ShareButton({ postUrl, postSlug, postTitle }: Props) {
  const t = useTranslations("share");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function handlePlatform(platform: SharePlatform) {
    const shareUrl = buildAuthorShareUrl(postUrl, postSlug, platform);

    if (platform === "copy") {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        window.prompt(t("copiedFallback"), shareUrl);
      }
      return;
    }

    const intent = buildSharePlatformIntent(shareUrl, postTitle, platform);
    if (intent) window.open(intent, "_blank", "noopener,noreferrer");
  }

  // Mobile (and any browser exposing the Web Share API) → the OS-native share sheet, which is the
  // expected pattern on a phone. Desktop falls back to the platform dropdown below.
  async function onTrigger() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: postTitle, url: postUrl });
      } catch {
        // user dismissed the share sheet — nothing to do
      }
      return;
    }
    setOpen((v) => !v);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={onTrigger}
        className="touch-target inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:border-accent-300 hover:text-accent-700 focus-ring dark:border-slate-700 dark:text-slate-300 dark:hover:border-accent-500/50 dark:hover:text-accent-400"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Share2 className="h-3.5 w-3.5" />
        {t("label")}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-48 origin-top-right animate-dropdown-in rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="menuitem"
              onClick={() => {
                handlePlatform(p.id);
                setOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-accent-50 hover:text-accent-800 focus-ring focus-visible:bg-accent-50 focus-visible:text-accent-800 dark:text-slate-300 dark:hover:bg-accent-500/15 dark:hover:text-accent-400"
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => handlePlatform("copy")}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-accent-50 hover:text-accent-800 focus-ring focus-visible:bg-accent-50 focus-visible:text-accent-800 dark:text-slate-300 dark:hover:bg-accent-500/15 dark:hover:text-accent-400"
          >
            {copied ? tc("copied") : tc("copy")}
            {copied && <Check className="h-3.5 w-3.5 text-accent-600" />}
          </button>
        </div>
      )}
    </div>
  );
}
