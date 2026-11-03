"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cancelRegistration } from "@/modules/events/api/events";

const SECTION = "mt-8";

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
      <section className={SECTION} aria-live="polite">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t("cancelDone")}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{t("cancelDoneBody")}</p>
      </section>
    );
  }

  return (
    <section className={SECTION}>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t("cancelTitle")}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        {t("cancelBody", { title: eventTitle })}
      </p>
      {phase === "error" ? (
        <p role="alert" className="mt-3 text-[15px] font-medium text-red-600 dark:text-red-400">
          {t("cancelError")}
        </p>
      ) : null}
      <button
        type="button"
        onClick={cancel}
        disabled={phase === "busy"}
        className={cn(buttonVariants({ variant: "destructive", size: "xl" }), "mt-5 h-12 w-full text-base font-semibold")}
      >
        {phase === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t("cancelConfirm")}
      </button>
    </section>
  );
}
