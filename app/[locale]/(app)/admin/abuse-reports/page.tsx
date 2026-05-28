"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  listAbuseReports,
  resolveAbuseReport,
  type AbuseReportStatus,
  type AbuseReportView,
  type AbuseResolution,
} from "@/lib/api/abuse-reports";

const STATUS_FILTERS: { id: AbuseReportStatus | "ALL"; label: string }[] = [
  { id: "ALL", label: "전체" },
  { id: "OPEN", label: "Open" },
  { id: "REVIEWING", label: "Reviewing" },
  { id: "RESOLVED", label: "Resolved" },
  { id: "REJECTED", label: "Rejected" },
];

const STATUS_BADGE: Record<AbuseReportStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  REVIEWING: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-gray-100 text-gray-600",
};

export default function AdminAbuseReportsPage() {
  const { ready, authenticated, isAdmin } = useAuth();
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
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!ready || !authenticated || !isAdmin) return;
    void load();
  }, [ready, authenticated, isAdmin, load]);

  if (!ready) return null;
  if (!authenticated || !isAdmin) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-gray-600">권한이 없습니다.</p>
      </main>
    );
  }

  async function handleResolve(report: AbuseReportView, resolution: AbuseResolution) {
    const note = window.prompt(`${resolution} 메모 (선택)`, "");
    if (note === null) return;
    try {
      const updated = await resolveAbuseReport(report.id, {
        resolution,
        adminNote: note.trim() || undefined,
      });
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "resolve failed");
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Abuse Reports</h1>
        <p className="mt-2 text-sm text-gray-500">
          신고 접수 list. CSAM auto-quarantine + DMCA 는 별도 트랙.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatusFilter(f.id)}
            className={`rounded-full px-3 py-1 text-sm ${
              statusFilter === f.id
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={load}
          className="ml-auto rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
        >
          새로고침
        </button>
      </div>

      {loading && <p className="text-gray-500">로딩 중…</p>}
      {error && <p className="text-red-600">에러: {error}</p>}

      {!loading && !error && reports.length === 0 && (
        <p className="text-gray-500">해당 상태의 신고가 없습니다.</p>
      )}

      {!loading && reports.length > 0 && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Subject</th>
              <th className="px-2 py-2">Reporter</th>
              <th className="px-2 py-2">Reason</th>
              <th className="px-2 py-2">Created</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 align-top">
                <td className="px-2 py-3 text-gray-500">{r.id}</td>
                <td className="px-2 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <code className="text-xs text-gray-700">
                    {r.subjectType} #{r.subjectId}
                  </code>
                </td>
                <td className="px-2 py-3 text-gray-600">
                  {r.reporterUserId ?? <span className="text-gray-400">anonymous</span>}
                </td>
                <td className="px-2 py-3 max-w-xs">
                  <p className="text-gray-700 line-clamp-3">
                    {r.reason ?? <span className="text-gray-400">—</span>}
                  </p>
                  {r.adminNote && (
                    <p className="mt-1 text-xs text-gray-500">note: {r.adminNote}</p>
                  )}
                </td>
                <td className="px-2 py-3 text-xs text-gray-500">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="px-2 py-3">
                  {r.status === "OPEN" || r.status === "REVIEWING" ? (
                    <div className="flex flex-col gap-1">
                      {r.status === "OPEN" && (
                        <button
                          type="button"
                          onClick={() => handleResolve(r, "REVIEWING")}
                          className="rounded border border-blue-200 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50"
                        >
                          Reviewing
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleResolve(r, "RESOLVED")}
                        className="rounded border border-emerald-200 px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50"
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(r, "REJECTED")}
                        className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-100"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">
                      {r.resolvedAt ? new Date(r.resolvedAt).toLocaleString() : "—"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
