"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { EditLinkDialog } from "@/components/links/edit-link-dialog";
import { Button } from "@/components/ui/button";
import { useInvalidateLinks } from "@/lib/api/links.queries";
import type { LinkDetail, MyLink } from "@/types";

function asEditable(detail: LinkDetail, shortUrl: string): MyLink {
  return {
    shortCode: detail.shortCode,
    shortUrl,
    originalUrl: detail.originalUrl,
    createdAt: "",
    expiresAt: detail.expiresAt,
    clickCount: 0,
    tags: detail.tags,
    clicksLast7d: [],
    note: detail.note,
  };
}

export function DestinationHealthBanner({ detail, shortUrl }: { detail: LinkDetail; shortUrl: string }) {
  const t = useTranslations("stats.destinationHealth");
  const invalidate = useInvalidateLinks();
  const [editing, setEditing] = useState(false);
  const health = detail.destinationHealth;
  if (!health?.broken) return null;

  const reason =
    health.failure === "NO_HOST" ? t("noHost") : t("missing", { status: String(health.httpStatus ?? "") });

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10"
    >
      <p className="flex min-w-0 items-start gap-2 text-[13px] leading-relaxed text-red-800 dark:text-red-200">
        <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <span className="font-semibold">{t("title")}</span> {reason}
        </span>
      </p>
      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
        {t("fix")}
      </Button>
      <EditLinkDialog
        link={editing ? asEditable(detail, shortUrl) : null}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          void invalidate();
        }}
      />
    </div>
  );
}
