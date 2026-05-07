"use client";

import { ExternalLink, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { CopyButton } from "./copy-button";
import { QrButton } from "./qr-button";
import { useToast } from "./ui/toast";
import { truncateMiddle } from "@/lib/utils";
import type { CreateLinkResponse } from "@/types";

type Props = {
  result: CreateLinkResponse;
  originalUrl: string;
};

export function ResultCard({ result, originalUrl }: Props) {
  const t = useTranslations("result");
  const { toast } = useToast();

  return (
    <div className="animate-fade-in rounded-lg border border-accent-200 bg-accent-50/40 p-5">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-accent-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("completed")}
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={result.shortUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sm font-semibold text-slate-900 hover:underline"
          >
            {result.shortUrl}
          </a>
          <div className="flex items-center gap-1.5">
            <CopyButton
              size="sm"
              variant="accent"
              label={t("copy")}
              value={result.shortUrl}
              onCopied={() => toast(t("copied"), "success")}
            />
            <QrButton url={result.shortUrl} />
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t("open")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <p className="truncate text-xs text-slate-600" title={originalUrl}>
          {t("originalUrl")}: {truncateMiddle(originalUrl, 80)}
        </p>
      </div>
    </div>
  );
}
