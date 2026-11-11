"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  STATUS_KEY,
  STATUS_STYLES,
  displayStatus,
  type AdminLinkDisplayStatus,
} from "@/components/admin/link-browser";
import { Section } from "@/components/common/section";
import { Link } from "@/i18n/navigation";
import { leadClicks } from "@/lib/admin-clicks";
import { cn, formatDate, formatNumber, truncateMiddle } from "@/lib/utils";
import type { AdminLinkRow } from "@/types";

export function MetaCard({ meta }: { meta: AdminLinkRow }) {
  const t = useTranslations("admin");
  const clicks = leadClicks(meta);
  return (
    <Section title={t("detail.title")}>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        <Field label={t("detail.meta.code")}>
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
              /{meta.shortCode}
            </span>
            {meta.passwordProtected && (
              <Lock className="h-3 w-3 text-slate-400" aria-label={t("detail.meta.locked")} />
            )}
            <StatusBadge status={displayStatus(meta)} />
          </span>
        </Field>

        <Field label={t("detail.meta.owner")}>
          {meta.ownerId != null ? (
            <Link
              href={`/admin/links?ownerId=${meta.ownerId}`}
              className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-900 dark:decoration-slate-600 dark:hover:decoration-slate-100 dark:text-slate-100"
            >
              {meta.ownerEmail ?? t("detail.anonymousOwner")}
            </Link>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">
              {t("detail.anonymousOwner")}
            </span>
          )}
        </Field>

        <Field label={t("detail.meta.destination")} className="sm:col-span-2">
          <span className="break-all text-slate-700 dark:text-slate-300" title={meta.originalUrl}>
            {truncateMiddle(meta.originalUrl, 72)}
          </span>
        </Field>

        <Field label={clicks.total == null ? t("detail.meta.clicks") : t("humanClicks")}>
          <span className="inline-flex flex-wrap items-baseline gap-x-2">
            <span
              data-testid="admin-link-clicks"
              className="font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100"
            >
              {formatNumber(clicks.lead)}
            </span>
            {clicks.total != null && (
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {t("totalClicks", { count: formatNumber(clicks.total) })}
              </span>
            )}
          </span>
        </Field>

        {meta.maxViews != null && (
          <Field label={t("detail.meta.views")}>
            <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
              {formatNumber(meta.viewCount)} / {formatNumber(meta.maxViews)}
            </span>
          </Field>
        )}

        <Field label={t("detail.meta.created")}>
          <span className="text-slate-700 dark:text-slate-300">{formatDate(meta.createdAt)}</span>
        </Field>

        <Field label={t("detail.meta.expires")}>
          <span className="text-slate-700 dark:text-slate-300">
            {meta.expiresAt ? formatDate(meta.expiresAt) : t("detail.meta.noExpiry")}
          </span>
        </Field>
      </dl>
    </Section>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminLinkDisplayStatus }) {
  const t = useTranslations("admin");
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {t(`browse.links.status.${STATUS_KEY[status]}`)}
    </span>
  );
}
