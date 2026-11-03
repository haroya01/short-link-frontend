"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { LinkDetail } from "@/types";
import { StatusLine, StatusTitle, statusActionClass } from "./status-line";

export function LinkModerationBanner({ detail }: { detail: LinkDetail }) {
  const t = useTranslations("stats.moderation");
  const format = useFormatter();
  const moderation = detail.moderation;
  if (!moderation) return null;

  const date = format.dateTime(new Date(moderation.disabledAt), { dateStyle: "long" });

  return (
    <StatusLine
      action={
        <Link
          href={`/report?link=${encodeURIComponent(`kurl.me/${detail.shortCode}`)}&reason=OTHER`}
          className={statusActionClass}
        >
          {t("appeal")}
        </Link>
      }
    >
      {t.rich(`notice.${moderation.reason}`, {
        date,
        title: (chunks) => <StatusTitle>{chunks}</StatusTitle>,
      })}
    </StatusLine>
  );
}
