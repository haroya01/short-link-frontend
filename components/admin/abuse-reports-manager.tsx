"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  listAbuseReports,
  resolveAbuseReport,
  unpublishReportedPost,
  type AbuseReportStatus,
  type AbuseReportView,
  type AbuseResolution,
} from "@/lib/api/abuse-reports";

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

/**
 * Abuse-report moderation queue — list, filter by status, and resolve (review/resolve/reject)
 * reports submitted via {@link submitAbuseReport}. Extracted from the links admin page so the blog
 * workspace can host the same queue without duplicating the table + resolve logic. Both the apex
 * `/admin/abuse-reports` page and `blog.kurl.me/admin` render this; each supplies its own shell +
 * isAdmin gate. All reports are blog content (subjectType is POST | USER), so the same list serves
 * the blog moderation surface directly.
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

  async function handleResolve(report: AbuseReportView, resolution: AbuseResolution) {
    const note = window.prompt(t("notePrompt", { resolution }), "");
    if (note === null) return;
    try {
      const updated = await resolveAbuseReport(report.id, {
        resolution,
        adminNote: note.trim() || undefined,
      });
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t("resolveFailed"));
    }
  }

  async function handleTakedown(report: AbuseReportView) {
    if (!window.confirm(t("takedownConfirm"))) return;
    try {
      await unpublishReportedPost(report.subjectId);
      // Reflect the takedown locally on every report that points at the same post — a popular post
      // can have several open reports, and they should all show "비공개됨" without a reload.
      setReports((prev) =>
        prev.map((r) =>
          r.subjectType === "POST" && r.subjectId === report.subjectId
            ? { ...r, subjectRemoved: true }
            : r,
        ),
      );
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t("takedownFailed"));
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
                          {r.subjectTitle ?? `${r.subjectType} #${r.subjectId}`}
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
                  <p className="text-slate-700 dark:text-slate-300 line-clamp-3">
                    {r.reason ?? <span className="text-slate-400 dark:text-slate-500">—</span>}
                  </p>
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
                      {r.subjectType === "POST" && !r.subjectRemoved && (
                        <button
                          type="button"
                          onClick={() => handleTakedown(r)}
                          className="rounded border border-red-200 dark:border-red-500/30 px-2 py-0.5 text-xs text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          {t("action.takedown")}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
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
