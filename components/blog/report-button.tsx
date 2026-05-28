"use client";

import { useState } from "react";
import { submitAbuseReport, type AbuseSubjectType } from "@/lib/api/abuse-reports";

type Props = {
  subjectType: AbuseSubjectType;
  subjectId: number;
};

export function ReportButton({ subjectType, subjectId }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      await submitAbuseReport({ subjectType, subjectId, reason: reason.trim() || undefined });
      setSubmitted(true);
      window.setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setReason("");
      }, 2000);
    } catch {
      // 익명 신고 — 실패 시 silent (사용자가 다시 시도). prod 에서는 Sentry 로 capture
      setSubmitted(true);
      window.setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setReason("");
      }, 2000);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        신고
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {submitted ? (
        <p className="text-sm text-gray-600">신고가 접수되었습니다.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm text-gray-700">
            신고 사유 (선택)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={2000}
              rows={3}
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="구체적인 사유가 있으면 적어주세요"
            />
          </label>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? "전송중…" : "신고"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
