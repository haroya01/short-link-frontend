"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { STATUS_KEY, STATUS_STYLES } from "@/components/admin/link-browser";
import { Section } from "@/components/common/section";
import { Link } from "@/i18n/navigation";
import { cn, formatDate, formatNumber, truncateMiddle } from "@/lib/utils";
import type { AdminLinkRow, AdminLinkStatus } from "@/types";

export function MetaCard({ meta }: { meta: AdminLinkRow }) {
  const t = useTranslations("admin");
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
            <StatusBadge status={meta.status} />
          </span>
        </Field>

        <Field label={t("detail.meta.owner")}>
          {meta.ownerId != null ? (
            <Link
              href={`/admin/links?ownerId=${meta.ownerId}`}
              className="text-accent-700 hover:underline dark:text-accent-400"
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
          <a
            href={meta.originalUrl}
            target="_blank"
            rel="noreferrer"
            className="break-all text-slate-700 hover:underline dark:text-slate-300"
            title={meta.originalUrl}
          >
            {truncateMiddle(meta.originalUrl, 72)}
          </a>
        </Field>

        <Field label={t("detail.meta.clicks")}>
          <span className="font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100">
            {formatNumber(meta.clickCount)}
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

function StatusBadge({ status }: { status: AdminLinkStatus }) {
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
