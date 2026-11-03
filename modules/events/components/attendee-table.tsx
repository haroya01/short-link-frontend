"use client";

import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import type { Attendee, EventQuestion } from "@/modules/events/api/events";
import { downloadAttendeesCsv } from "@/modules/events/api/events";

export function AttendeeTable({
  eventId,
  attendees,
  questions,
}: {
  eventId: number;
  attendees: Attendee[];
  questions: EventQuestion[];
}) {
  const t = useTranslations("events.attendees");
  const { toast } = useToast();

  const exportCsv = async () => {
    try {
      const { blob, filename } = await downloadAttendeesCsv(eventId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename ?? "attendees.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast(t("exportFailed"), "error");
    }
  };

  return (
    <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {t("title", { count: attendees.filter((a) => a.status === "CONFIRMED").length })}
        </h2>
        {attendees.length > 0 ? (
          <button
            type="button"
            onClick={exportCsv}
            className="focus-ring inline-flex min-h-11 items-center rounded-sm text-[13px] font-medium text-slate-600 underline decoration-slate-300 underline-offset-[3px] transition-colors hover:text-slate-900 dark:text-slate-300 dark:decoration-slate-600"
          >
            {t("exportCsv")}
          </button>
        ) : null}
      </div>

      {attendees.length === 0 ? (
        <p className="mt-3 text-[14px] text-slate-500 dark:text-slate-400">{t("empty")}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-[12px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="whitespace-nowrap pb-2 pr-3 font-medium">{t("name")}</th>
                <th className="whitespace-nowrap pb-2 pr-3 font-medium">{t("contact")}</th>
                <th className="whitespace-nowrap pb-2 pr-3 font-medium">{t("channel")}</th>
                <th className="whitespace-nowrap pb-2 pr-3 font-medium">{t("status")}</th>
                {questions.map((question) => (
                  <th key={question.id} className="whitespace-nowrap pb-2 pr-3 font-medium">
                    {question.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attendees.map((attendee) => (
                <tr
                  key={attendee.id}
                  className={
                    attendee.status === "CANCELED"
                      ? "border-b border-slate-100 text-slate-500 line-through dark:border-slate-800 dark:text-slate-400"
                      : "border-b border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-300"
                  }
                >
                  <td className="py-2.5 pr-3 font-medium">{attendee.name}</td>
                  <td className="py-2.5 pr-3">{attendee.contact}</td>
                  <td className="py-2.5 pr-3">
                    {attendee.channel ?? <span className="text-slate-500 dark:text-slate-400">—</span>}
                  </td>
                  <td className="py-2.5 pr-3">
                    {attendee.status === "CONFIRMED" ? t("confirmed") : t("canceled")}
                  </td>
                  {questions.map((question) => (
                    <td key={question.id} className="py-2.5 pr-3">
                      {attendee.answers[String(question.id)] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
