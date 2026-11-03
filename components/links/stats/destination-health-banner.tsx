"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { EditLinkDialog } from "@/components/links/edit-link-dialog";
import { useInvalidateLinks } from "@/lib/api/links.queries";
import type { LinkDetail, MyLink } from "@/types";
import { StatusLine, StatusTitle, statusActionClass } from "./status-line";

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
    <>
      <StatusLine
        action={
          <button type="button" onClick={() => setEditing(true)} className={statusActionClass}>
            {t("fix")}
          </button>
        }
      >
        <StatusTitle>{t("title")}</StatusTitle> {reason}
      </StatusLine>
      <EditLinkDialog
        link={editing ? asEditable(detail, shortUrl) : null}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          void invalidate();
        }}
      />
    </>
  );
}
