"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarX2, Loader2 } from "lucide-react";
import { cancelRegistration } from "@/modules/events/api/events";

export function CancelRegistrationPanel({
  token,
  eventTitle,
}: {
  token: string;
  eventTitle: string;
}) {
  const t = useTranslations("events.public");
  const [phase, setPhase] = useState<"idle" | "busy" | "done" | "error">("idle");

  const cancel = async () => {
    setPhase("busy");
    try {
      await cancelRegistration(token);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  };

  if (phase === "done") {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
          {t("cancelDone")}
        </p>
        <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
          {t("cancelDoneBody")}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
      <div className="flex items-center gap-2.5">
        <CalendarX2 className="h-5 w-5 text-red-500" />
        <h2 className="text-[15px] font-semibold text-red-900 dark:text-red-200">
          {t("cancelTitle")}
        </h2>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-red-800 dark:text-red-300">
        {t("cancelBody", { title: eventTitle })}
      </p>
      {phase === "error" ? (
        <p role="alert" className="mt-2 text-[12px] font-medium text-red-600 dark:text-red-400">
          {t("cancelError")}
        </p>
      ) : null}
      <button
        type="button"
        onClick={cancel}
        disabled={phase === "busy"}
        className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-[13px] font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
      >
        {phase === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t("cancelConfirm")}
      </button>
    </section>
  );
}
