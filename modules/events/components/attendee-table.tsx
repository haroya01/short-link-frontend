"use client";

import { useTranslations } from "next-intl";
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
    <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {t("title", { count: attendees.filter((a) => a.status === "CONFIRMED").length })}
        </h2>
        {attendees.length > 0 ? (
          <button
            type="button"
            onClick={exportCsv}
            className="focus-ring rounded-sm text-[13px] font-medium text-slate-600 underline decoration-slate-300 underline-offset-[3px] transition-colors hover:text-slate-900 dark:text-slate-300 dark:decoration-slate-600"
          >
            {t("exportCsv")}
          </button>
        ) : null}
      </div>

      {attendees.length === 0 ? (
        <p className="mt-3 text-[14px] text-slate-500 dark:text-slate-400">{t("empty")}</p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 sm:hidden">
            {attendees.map((attendee) => {
              const canceled = attendee.status === "CANCELED";
              return (
                <li key={attendee.id} className="py-3 text-[13px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={
                        canceled
                          ? "min-w-0 break-words text-sm font-medium text-slate-500 line-through dark:text-slate-400"
                          : "min-w-0 break-words text-sm font-medium text-slate-900 dark:text-slate-100"
                      }
                    >
                      {attendee.name}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                      {canceled ? t("canceled") : t("confirmed")}
                    </span>
                  </div>
                  <p className="mt-0.5 break-all text-slate-600 dark:text-slate-300">
                    <span className={canceled ? "line-through" : undefined}>{attendee.contact}</span>
                    {attendee.channel && <span className="text-slate-500 dark:text-slate-400"> · {attendee.channel}</span>}
                  </p>
                  {questions.some((question) => attendee.answers[String(question.id)]) && (
                    <dl className="mt-1.5 space-y-0.5">
                      {questions.map((question) => {
                        const answer = attendee.answers[String(question.id)];
                        if (!answer) return null;
                        return (
                          <div key={question.id} className="break-words">
                            <dt className="inline text-slate-500 dark:text-slate-400">{question.label} </dt>
                            <dd className="inline text-slate-700 dark:text-slate-300">{answer}</dd>
                          </div>
                        );
                      })}
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-4 hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-[12px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
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
        </>
      )}
    </section>
  );
}
