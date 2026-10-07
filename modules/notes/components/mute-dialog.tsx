"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { usePresence } from "@/hooks/use-presence";
import { useToast } from "@/components/ui/toast";
import { muteUser, type MuteStatus } from "@/modules/notes/api/notes";

const DURATIONS = [0, 300, 1800, 3600, 21_600, 86_400, 259_200, 604_800] as const;

export function MuteDialog({
  username,
  open,
  onClose,
  onMuted,
}: {
  username: string;
  open: boolean;
  onClose: () => void;
  onMuted: (status: MuteStatus) => void;
}) {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [duration, setDuration] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const { mounted: present, closing } = usePresence(open, 160);

  useEffect(() => setMounted(true), []);
  useFocusTrap(panel, { active: open, onEscape: onClose, autoFocus: true });

  async function mute() {
    setSaving(true);
    try {
      onMuted(await muteUser(username, notifications, duration === 0 ? null : duration));
      toast(t("mutedToast", { username }));
      onClose();
    } catch {
      toast(t("muteFailed"), "error");
    } finally {
      setSaving(false);
    }
  }

  if (!present || !mounted) return null;

  return createPortal(
    <div
      aria-hidden={closing || undefined}
      className={cn("fixed inset-0 z-50 overflow-y-auto px-4 pt-12 sm:pt-20", closing && "pointer-events-none")}
    >
      <div
        aria-hidden
        onClick={onClose}
        className={cn("fixed inset-0 scrim", closing ? "animate-fade-out" : "animate-fade-in")}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative mx-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-modal dark:border-slate-800 dark:bg-slate-850",
          closing ? "animate-fade-out" : "animate-fade-in",
        )}
      >
        <h2 id={titleId} className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
          {t("muteTitle", { username })}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t("muteHint", { username })}
        </p>
        <div className="mt-4 space-y-3 text-[14px] text-slate-800 dark:text-slate-200">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            {t("muteNotifications")}
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="h-4 w-4 accent-accent-700"
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            {t("muteDuration")}
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="focus-ring rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-[13px] dark:border-slate-700"
            >
              {DURATIONS.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds === 0
                    ? t("muteForever")
                    : seconds < 3600
                      ? t("pollMinutes", { count: seconds / 60 })
                      : seconds < 86_400
                        ? t("pollHours", { count: seconds / 3600 })
                        : t("pollDays", { count: seconds / 86_400 })}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-full px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={mute}
            disabled={saving}
            className="focus-ring rounded-full bg-slate-900 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-slate-700 disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {t("mute")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
