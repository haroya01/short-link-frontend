"use client";

import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/common/copy-button";
import { ShareButton } from "@/components/common/share-button";
import { useToast } from "@/components/ui/toast";

/**
 * "Your link has 0 clicks — share it!" CTA. Shown above the stats body when totalClicks is 0
 * so the empty graphs feel like a next step rather than a dead end. Dashed accent border on
 * an accent tint surface — the only place on the stats page we lean heavily into the brand
 * green; everywhere else accent is restrained so first-time visitors with 0 clicks notice
 * this card without us shouting at returning owners with rich data.
 */
export function StatsEmptyState({ shortUrl }: { shortUrl: string }) {
  const t = useTranslations("statsEmpty");
  const { toast } = useToast();
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-accent-300 bg-accent-50/40 px-6 py-10 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-accent-200/20 blur-3xl"
      />
      <div className="relative">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white dark:bg-slate-900 text-accent-700 dark:text-accent-400 shadow-sm">
          <Send className="h-4 w-4" />
        </span>
        <h3 className="mt-3 text-base font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("title")}</h3>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          {t("description")}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <CopyButton
            size="sm"
            variant="accent"
            label={t("shareCta")}
            value={shortUrl}
            onCopied={() => toast(t("shareCopied"), "success")}
          />
          <ShareButton url={shortUrl} title={shortUrl} />
        </div>
      </div>
    </div>
  );
}
