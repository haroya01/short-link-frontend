"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { buildExpiryPatch, toLocalInput } from "@/components/links/edit-link-dialog/utils";
import { useInvalidateLinks } from "@/lib/api/links.queries";
import { getLinkDetail, setLinkVisitOptions, updateLink } from "@/lib/api/links";
import { useApiErrorMessage } from "@/lib/error-messages";

function tomorrowMorning(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return toLocalInput(d.toISOString());
}

/** 이 링크가 언제 열리고 언제 닫히는지 — 공개 예약·만료와 닫힌 뒤의 안내 문구를 한곳에서. */
export function LinkPeriodSection({ shortCode }: { shortCode: string }) {
  const t = useTranslations("stats.period");
  const tVisit = useTranslations("stats.visit");
  const tEdit = useTranslations("edit");
  const { toast } = useToast();
  const toMessage = useApiErrorMessage();
  const invalidateLinks = useInvalidateLinks();
  const scheduleId = useId();
  const expiryId = useId();

  const [loaded, setLoaded] = useState<{ opensAt: string | null; expiresAt: string | null; message: string } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [schedule, setSchedule] = useState({ on: false, local: "" });
  const [expiry, setExpiry] = useState({ on: false, local: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState<"scheduleInPast" | "expiryBeforeOpen" | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(null);
    setLoadFailed(false);
    getLinkDetail(shortCode)
      .then((detail) => {
        if (!active) return;
        const opensAt = detail.opensAt ?? null;
        const expiresAt = detail.expiresAt ?? null;
        setLoaded({ opensAt, expiresAt, message: detail.expiredMessage ?? "" });
        setSchedule({ on: Boolean(opensAt), local: opensAt ? toLocalInput(opensAt) : "" });
        setExpiry({ on: Boolean(expiresAt), local: expiresAt ? toLocalInput(expiresAt) : "" });
        setMessage(detail.expiredMessage ?? "");
      })
      .catch(() => active && setLoadFailed(true));
    return () => {
      active = false;
    };
  }, [shortCode]);

  const scheduleDirty =
    loaded != null &&
    (schedule.on !== Boolean(loaded.opensAt) ||
      (schedule.on && schedule.local !== (loaded.opensAt ? toLocalInput(loaded.opensAt) : "")));
  const expiryInput = expiry.on ? expiry.local : "";
  const expiryPatch = loaded ? buildExpiryPatch(loaded.expiresAt, expiryInput) : {};
  const expiryDirty = Object.keys(expiryPatch).length > 0;
  const messageDirty = loaded != null && message !== loaded.message;
  const dirty = scheduleDirty || expiryDirty || messageDirty;

  async function save() {
    if (saving || !dirty || !loaded) return;
    const opensAt = schedule.on && schedule.local ? new Date(schedule.local) : null;
    if (scheduleDirty && schedule.on && (!opensAt || opensAt.getTime() <= Date.now())) {
      setError("scheduleInPast");
      return;
    }
    if (opensAt && expiry.on && expiry.local && new Date(expiry.local).getTime() <= opensAt.getTime()) {
      setError("expiryBeforeOpen");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      let nextOpensAt = loaded.opensAt;
      if (scheduleDirty) {
        const saved = await setLinkVisitOptions(
          shortCode,
          schedule.on && opensAt ? { opensAt: opensAt.toISOString() } : { clearOpensAt: true },
        );
        nextOpensAt = saved.opensAt ?? null;
      }
      let nextExpiresAt = loaded.expiresAt;
      if (expiryDirty || messageDirty) {
        const saved = await updateLink(shortCode, {
          ...expiryPatch,
          expiredMessage: messageDirty ? message : undefined,
        });
        nextExpiresAt = saved.expiresAt ?? null;
      }
      setLoaded({ opensAt: nextOpensAt, expiresAt: nextExpiresAt, message });
      setSchedule({ on: Boolean(nextOpensAt), local: nextOpensAt ? toLocalInput(nextOpensAt) : "" });
      setExpiry({ on: Boolean(nextExpiresAt), local: nextExpiresAt ? toLocalInput(nextExpiresAt) : "" });
      void invalidateLinks();
      toast(tVisit("saved"), "success");
    } catch (e) {
      toast(toMessage(e, tVisit("failed")), "error");
    } finally {
      setSaving(false);
    }
  }

  const loading = loaded == null && !loadFailed;
  const disabled = loading || loadFailed || saving;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-[15px] font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("title")}</h2>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p id={scheduleId} className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
            {tVisit("schedule")}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{tVisit("scheduleDesc")}</p>
        </div>
        <Switch
          checked={schedule.on}
          disabled={disabled}
          aria-labelledby={scheduleId}
          className="mt-0.5"
          onClick={() => {
            setError(null);
            setSchedule((s) => ({ on: !s.on, local: s.local || tomorrowMorning() }));
          }}
        />
      </div>
      {schedule.on && (
        <label className="mt-3 block space-y-1.5">
          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{tVisit("scheduleAt")}</span>
          <Input
            type="datetime-local"
            value={schedule.local}
            disabled={saving}
            aria-invalid={error === "scheduleInPast"}
            onChange={(e) => {
              setSchedule((s) => ({ ...s, local: e.target.value }));
              setError(null);
            }}
            className="sm:max-w-xs"
          />
          {error === "scheduleInPast" && (
            <span role="alert" className="block text-[12px] text-red-600 dark:text-red-400">
              {tVisit("scheduleInPast")}
            </span>
          )}
        </label>
      )}

      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p id={expiryId} className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
              {t("expiry")}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{t("expiryDesc")}</p>
          </div>
          <Switch
            checked={expiry.on}
            disabled={disabled}
            aria-labelledby={expiryId}
            className="mt-0.5"
            onClick={() => {
              setError(null);
              setExpiry((s) => ({ on: !s.on, local: s.local || tomorrowMorning() }));
            }}
          />
        </div>
        {expiry.on && (
          <label className="mt-3 block space-y-1.5">
            <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{t("expiryAt")}</span>
            <Input
              type="datetime-local"
              value={expiry.local}
              disabled={saving}
              aria-invalid={error === "expiryBeforeOpen"}
              onChange={(e) => {
                setExpiry((s) => ({ ...s, local: e.target.value }));
                setError(null);
              }}
              className="sm:max-w-xs"
            />
            {error === "expiryBeforeOpen" && (
              <span role="alert" className="block text-[12px] text-red-600 dark:text-red-400">
                {t("expiryBeforeOpen")}
              </span>
            )}
          </label>
        )}
      </div>

      <label className="mt-4 block space-y-1.5 border-t border-slate-100 pt-4 dark:border-slate-800">
        <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{tEdit("expiredMessageLabel")}</span>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={tEdit("expiredMessagePlaceholder")}
          maxLength={500}
          rows={2}
          disabled={disabled}
        />
        <span className="block text-[12px] text-slate-500 dark:text-slate-400">{tEdit("expiredMessageHint")}</span>
      </label>

      <div className="mt-4 flex items-center justify-end gap-3">
        {loadFailed && (
          <p role="alert" className="mr-auto text-[12px] text-red-600 dark:text-red-400">
            {tVisit("loadFailed")}
          </p>
        )}
        {dirty && <span className="text-[12px] text-slate-500 dark:text-slate-400">{tVisit("unsaved")}</span>}
        <Button variant="outline" size="sm" onClick={() => void save()} disabled={!dirty || disabled}>
          {tVisit("save")}
        </Button>
      </div>
    </section>
  );
}
