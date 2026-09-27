"use client";

import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/common/copy-button";
import { ShareButton } from "@/components/common/share-button";
import { useToast } from "@/components/ui/toast";

export function StatsEmptyState({ shortUrl }: { shortUrl: string }) {
  const t = useTranslations("statsEmpty");
  const { toast } = useToast();
  const display = shortUrl.replace(/^https?:\/\//, "");
  const slash = display.indexOf("/");
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
      <h3 className="text-[17px] font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("title")}</h3>
      <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">{t("description")}</p>
      <p className="mt-5 border-l-2 border-accent-600 py-0.5 pl-3 font-mono text-[17px] font-semibold tracking-tight text-slate-900 dark:border-accent-500 dark:text-slate-100">
        {slash > 0 ? (
          <>
            <span className="text-slate-400 dark:text-slate-500">{display.slice(0, slash + 1)}</span>
            {display.slice(slash + 1)}
          </>
        ) : (
          display
        )}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
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
  );
}
