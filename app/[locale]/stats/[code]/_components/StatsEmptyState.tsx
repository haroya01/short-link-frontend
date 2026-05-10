"use client";

import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/copy-button";
import { ShareButton } from "@/components/share-button";
import { useToast } from "@/components/ui/toast";

/**
 * "Your link has 0 clicks — share it!" CTA. Shown above the stats body when totalClicks is 0
 * so the empty graphs feel like a next step rather than a dead end.
 */
export function StatsEmptyState({ shortUrl }: { shortUrl: string }) {
  const t = useTranslations("statsEmpty");
  const { toast } = useToast();
  return (
    <div className="rounded-lg border border-dashed border-accent-300 bg-accent-50/40 p-8 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{t("title")}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{t("description")}</p>
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
  );
}
