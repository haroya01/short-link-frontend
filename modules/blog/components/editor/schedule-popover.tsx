"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Schedule-to-publish control for a draft. Opens a small popover with a datetime picker (min = now)
 * and hands the chosen instant back as ISO. The backend rejects past times; we also pre-validate so
 * the user gets an immediate nudge.
 */
export function SchedulePopover({
  disabled,
  onSchedule,
}: {
  disabled?: boolean;
  onSchedule: (iso: string) => void;
}) {
  const t = useTranslations("postEditor");
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [err, setErr] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // datetime-local needs "YYYY-MM-DDTHH:mm" in local time; default to one hour out.
  const localMin = toLocalInput(new Date(Date.now() + 60_000));

  function confirm() {
    if (!value) {
      setErr(true);
      return;
    }
    const when = new Date(value);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      setErr(true);
      return;
    }
    onSchedule(when.toISOString());
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
      >
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4" />
          {t("schedule")}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <label className="block text-[12px] font-medium text-slate-500">{t("scheduleAt")}</label>
          <input
            type="datetime-local"
            min={localMin}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setErr(false);
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus-ring"
          />
          {err && <p className="mt-1 text-[12px] text-red-600">{t("scheduleInvalid")}</p>}
          <button
            type="button"
            onClick={confirm}
            className="mt-3 w-full rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700"
          >
            {t("scheduleConfirm")}
          </button>
        </div>
      )}
    </div>
  );
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
