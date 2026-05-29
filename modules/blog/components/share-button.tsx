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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:border-accent-300 hover:text-accent-700 focus-ring"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Share2 className="h-3.5 w-3.5" />
        {t("label")}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-48 origin-top-right animate-dropdown-in rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
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
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-accent-50 hover:text-accent-800"
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => handlePlatform("copy")}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-accent-50 hover:text-accent-800"
          >
            {copied ? tc("copied") : tc("copy")}
            {copied && <Check className="h-3.5 w-3.5 text-accent-600" />}
          </button>
        </div>
      )}
    </div>
  );
}
