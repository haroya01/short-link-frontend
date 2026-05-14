"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Top-of-editor banner showing the owner's public profile URL with a prominent "open" CTA.
 * Previously the URL was a small pill tucked under the save button — visually competing with
 * autosave hints and easy to miss, so users didn't realize they could one-tap into their
 * live profile to see how visitors saw it. Promoting it to a dedicated header row makes the
 * connection obvious: edit here → see it there.
 *
 * <p>The whole row is the click target (link to the public URL); copy lives as a secondary
 * button to the right. Hover/active styles keep the row feeling like a button, not a static
 * banner.
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
    <div className="flex items-stretch gap-0 overflow-hidden rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white shadow-sm">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="group flex flex-1 items-center gap-3 px-4 py-3 transition hover:bg-emerald-50"
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-emerald-600 text-white">
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-emerald-900">{t("openProfile")}</p>
          <p className="truncate font-mono text-[11px] text-slate-500">{display}</p>
        </div>
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label={t("copyPublicUrl")}
        title={t("copyPublicUrl")}
        className="grid w-12 shrink-0 place-items-center border-l border-emerald-200/60 text-slate-500 transition hover:bg-emerald-50 hover:text-slate-900"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
