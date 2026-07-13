"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  listAbuseReports,
  resolveAbuseReport,
  type AbuseAction,
  type AbuseReportStatus,
  type AbuseReportView,
  type AbuseResolution,
} from "@/lib/api/abuse-reports";
import {
  actionRequiresExpiry,
  availableActions,
  reasonLabelKey,
} from "@/lib/api/abuse-report-reasons";

const STATUS_FILTERS: (AbuseReportStatus | "ALL")[] = [
  "ALL",
  "OPEN",
  "REVIEWING",
  "RESOLVED",
  "REJECTED",
];

const STATUS_BADGE: Record<AbuseReportStatus, string> = {
  OPEN: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300",
  REVIEWING: "bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300",
  RESOLVED: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  REJECTED: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
};

/** Destructive actions (unpublish/delete/ban) get the red treatment; suspend is a softer sanction. */
const ACTION_DESTRUCTIVE: Record<AbuseAction, boolean> = {
  UNPUBLISH_POST: true,
  DELETE_COMMENT: true,
  SUSPEND_USER: false,
  BAN_USER: true,
};

/**
 * Abuse-report moderation queue — list, filter by status, and resolve reports with the moderation
 * context the #611 contract now supplies: a structured `reasonCode` + reporter `detail`, and a
 * `subjectExcerpt` snapshot so COMMENT and USER reports (which have no title/URL) are judgeable in
 * the row. Each subject type offers its own enforcement actions (unpublish post / delete comment /
 * suspend or ban user); an action is folded into the resolve call, or a report is resolved with no
 * action ("reviewed, no violation").
 *
 * Both the apex `/admin/abuse-reports` page and `blog.kurl.me/admin` render this; each supplies its
 * own shell + isAdmin gate.
 */
export function AbuseReportsManager() {
  const t = useTranslations("abuseReports");
  const tc = useTranslations("common");
  const [reports, setReports] = useState<AbuseReportView[]>([]);
  const [statusFilter, setStatusFilter] = useState<AbuseReportStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter = statusFilter === "ALL" ? undefined : statusFilter;
      const list = await listAbuseReports(filter);
      setReports(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = useCallback((updated: AbuseReportView) => {
    setReports((prev) => {
      const next = prev.map((r) => (r.id === updated.id ? updated : r));
      // A takedown on a POST/COMMENT should show as removed on every report that points at the same
      // subject — one popular post can gather several reports and they'd otherwise disagree.
      if (updated.subjectRemoved) {
        return next.map((r) =>
          r.subjectType === updated.subjectType && r.subjectId === updated.subjectId
            ? { ...r, subjectRemoved: true }
            : r,
        );
      }
      return next;
    });
  }, []);

  /** Resolve with no enforcement — review/resolve/reject transitions. */
  async function handleResolve(report: AbuseReportView, resolution: AbuseResolution) {
    const note = window.prompt(t("notePrompt", { resolution: t(`status.${resolution}`) }), "");
    if (note === null) return;
    try {
      const updated = await resolveAbuseReport(report.id, {
        resolution,
        adminNote: note.trim() || undefined,
      });
      apply(updated);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t("resolveFailed"));
    }
  }

  /**
   * Resolve + enforce in one call. A SUSPEND_USER needs an expiry, so we collect it (the backend
   * rejects it as SUSPEND_REQUIRES_EXPIRY otherwise). Everything else just confirms first.
   */
  async function handleAction(report: AbuseReportView, action: AbuseAction) {
    let suspendUntil: string | undefined;
    if (actionRequiresExpiry(action)) {
      const days = window.prompt(t("suspendDaysPrompt"), "7");
      if (days === null) return;
      const n = Number.parseInt(days, 10);
      if (!Number.isFinite(n) || n <= 0) {
        window.alert(t("suspendDaysInvalid"));
        return;
      }
      suspendUntil = new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
    } else if (!window.confirm(t(`actionConfirm.${action}`))) {
      return;
    }
    const note = window.prompt(t("notePrompt", { resolution: t(`action.${action}`) }), "");
    if (note === null) return;
    try {
      const updated = await resolveAbuseReport(report.id, {
        resolution: "RESOLVED",
        action,
        suspendUntil,
        adminNote: note.trim() || undefined,
      });
      apply(updated);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t("resolveFailed"));
    }
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatusFilter(id)}
            className={`rounded-full px-3 py-1 text-sm ${
              statusFilter === id
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {id === "ALL" ? t("filterAll") : t(`status.${id}`)}
          </button>
        ))}
        <button
          type="button"
          onClick={load}
          className="ml-auto rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          {t("refresh")}
        </button>
      </div>

      {loading && <p className="text-slate-500 dark:text-slate-400">{tc("loading")}</p>}
      {error && (
        <p className="text-red-600 dark:text-red-400">
          {tc("errorPrefix")} {error}
        </p>
      )}

      {!loading && !error && reports.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400">{t("empty")}</p>
      )}

      {!loading && reports.length > 0 && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs uppercase text-slate-500 dark:text-slate-400">
              <th className="px-2 py-2">{t("column.id")}</th>
              <th className="px-2 py-2">{t("column.status")}</th>
              <th className="px-2 py-2">{t("column.subject")}</th>
              <th className="px-2 py-2">{t("column.reporter")}</th>
              <th className="px-2 py-2">{t("column.reason")}</th>
              <th className="px-2 py-2">{t("column.created")}</th>
              <th className="px-2 py-2">{t("column.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 align-top">
                <td className="px-2 py-3 text-slate-500 dark:text-slate-400">{r.id}</td>
                <td className="px-2 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}
                  >
                    {t(`status.${r.status}`)}
                  </span>
                </td>
                <td className="px-2 py-3 max-w-xs">
                  {r.subjectTitle || r.subjectAuthorHandle ? (
                    <div className="min-w-0">
                      {r.subjectUrl ? (
                        <a
                          href={r.subjectUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100 hover:underline"
                        >
                          {r.subjectTitle ?? `${r.subjectType} #${r.subjectId}`}
                        </a>
                      ) : (
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {r.subjectTitle ?? `${t(`subjectType.${r.subjectType}`)} #${r.subjectId}`}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {t(`subjectType.${r.subjectType}`)}
                        {r.subjectAuthorHandle && ` · @${r.subjectAuthorHandle}`}
                      </p>
                    </div>
                  ) : (
                    <code className="text-xs text-slate-700 dark:text-slate-300">
                      {t(`subjectType.${r.subjectType}`)} #{r.subjectId}
                    </code>
                  )}
                  {/* Content snapshot — the only handle a moderator has on COMMENT / USER reports. */}
                  {r.subjectExcerpt && (
                    <p className="mt-1 line-clamp-2 rounded bg-slate-50 dark:bg-slate-800/60 px-2 py-1 text-xs italic text-slate-600 dark:text-slate-400">
                      “{r.subjectExcerpt}”
                    </p>
                  )}
                  {r.subjectRemoved && (
                    <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {t("removed")}
                    </span>
                  )}
                </td>
                <td className="px-2 py-3 text-slate-600 dark:text-slate-400">
                  {r.reporterUserId ?? <span className="text-slate-400 dark:text-slate-500">{t("anonymous")}</span>}
                </td>
                <td className="px-2 py-3 max-w-xs">
                  {r.reasonCode ? (
                    <span className="inline-block rounded bg-red-50 dark:bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
                      {t(reasonLabelKey(r.reasonCode))}
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">—</span>
                  )}
                  {r.detail && (
                    <p className="mt-1 text-slate-700 dark:text-slate-300 line-clamp-3">{r.detail}</p>
                  )}
                  {r.adminNote && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("noteLabel")}: {r.adminNote}</p>
                  )}
                </td>
                <td className="px-2 py-3 text-xs text-slate-500 dark:text-slate-400">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="px-2 py-3">
                  {r.status === "OPEN" || r.status === "REVIEWING" ? (
                    <div className="flex flex-col gap-1">
                      {r.status === "OPEN" && (
                        <button
                          type="button"
                          onClick={() => handleResolve(r, "REVIEWING")}
                          className="rounded border border-blue-200 dark:border-blue-500/30 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                        >
                          {t("action.reviewing")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleResolve(r, "RESOLVED")}
                        className="rounded border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                      >
                        {t("action.resolve")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(r, "REJECTED")}
                        className="rounded border border-slate-200 dark:border-slate-800 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        {t("action.reject")}
                      </button>
                      {availableActions(r.subjectType, { subjectRemoved: r.subjectRemoved }).map(
                        (action) => (
                          <button
                            key={action}
                            type="button"
                            onClick={() => handleAction(r, action)}
                            className={`rounded border px-2 py-0.5 text-xs ${
                              ACTION_DESTRUCTIVE[action]
                                ? "border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                                : "border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                            }`}
                          >
                            {t(`action.${action}`)}
                          </button>
                        ),
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {r.resolvedAt ? new Date(r.resolvedAt).toLocaleString() : "—"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
