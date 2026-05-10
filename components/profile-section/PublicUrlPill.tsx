"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { useTranslations } from "next-intl";

type Props = {
  url: string;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * Inline copy-to-clipboard pill for the user's public profile URL. Lives next to the QR button in
 * the editor. Falls back silently when {@code navigator.clipboard} is unavailable (older Safari,
 * insecure context).
 */
export function PublicUrlPill({ url, t }: Props) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — silently no-op */
    }
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900"
      >
        <ExternalLink className="h-3 w-3" />
        {url.replace(/^https?:\/\//, "")}
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label={t("copyPublicUrl")}
        title={t("copyPublicUrl")}
        className="text-slate-400 hover:text-slate-700"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
      </button>
    </span>
  );
}
