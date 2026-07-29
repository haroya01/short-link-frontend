"use client";

import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
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

  const exportCsv = async () => {
    const { blob, filename } = await downloadAttendeesCsv(eventId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? "attendees.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">
          {t("title", { count: attendees.filter((a) => a.status === "CONFIRMED").length })}
        </h2>
        {attendees.length > 0 ? (
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] font-medium text-slate-600 transition-colors hover:border-slate-500 dark:border-slate-700 dark:text-slate-300"
          >
            <Download className="h-3.5 w-3.5" />
            {t("exportCsv")}
          </button>
        ) : null}
      </div>

      {attendees.length === 0 ? (
        <p className="mt-4 text-[13px] text-slate-400">{t("empty")}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-700">
                <th className="pb-2 pr-3 font-medium">{t("name")}</th>
                <th className="pb-2 pr-3 font-medium">{t("contact")}</th>
                <th className="pb-2 pr-3 font-medium">{t("channel")}</th>
                <th className="pb-2 pr-3 font-medium">{t("status")}</th>
                {questions.map((question) => (
                  <th key={question.id} className="pb-2 pr-3 font-medium">
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
                      ? "border-b border-slate-100 text-slate-400 line-through dark:border-slate-800"
                      : "border-b border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-300"
                  }
                >
                  <td className="py-2.5 pr-3 font-medium">{attendee.name}</td>
                  <td className="py-2.5 pr-3">{attendee.contact}</td>
                  <td className="py-2.5 pr-3">
                    {attendee.channel ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium no-underline dark:bg-slate-800">
                        {attendee.channel}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-[12px]">
                    {attendee.status === "CONFIRMED" ? t("confirmed") : t("canceled")}
                  </td>
                  {questions.map((question) => (
                    <td key={question.id} className="py-2.5 pr-3 text-[12px]">
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
