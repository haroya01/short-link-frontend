"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import type { ContactField, EventDraft, MyEvent, QuestionSpec } from "@/modules/events/api/events";
import { isoToWallTime, wallTimeToIso } from "@/modules/events/lib/format";
import { QuestionBuilder } from "./question-builder";

const TIMEZONES = ["Asia/Tokyo", "Asia/Seoul", "UTC", "America/Los_Angeles", "Europe/London"];
const CONTACT_FIELDS: ContactField[] = ["EMAIL", "PHONE", "KAKAO"];

type FormState = {
  title: string;
  descriptionMd: string;
  timezone: string;
  startsAtLocal: string;
  endsAtLocal: string;
  locationText: string;
  locationUrl: string;
  onlineUrl: string;
  capacity: string;
  closeAtLocal: string;
  contactField: ContactField;
  questions: QuestionSpec[];
};

function initialState(event: MyEvent | null): FormState {
  const timezone =
    event?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "Asia/Tokyo";
  return {
    title: event?.title ?? "",
    descriptionMd: event?.descriptionMd ?? "",
    timezone,
    startsAtLocal: event ? isoToWallTime(event.startsAt, timezone) : "",
    endsAtLocal: event?.endsAt ? isoToWallTime(event.endsAt, timezone) : "",
    locationText: event?.locationText ?? "",
    locationUrl: event?.locationUrl ?? "",
    onlineUrl: event?.onlineUrl ?? "",
    capacity: event?.capacity != null ? String(event.capacity) : "",
    closeAtLocal: event?.closeAt ? isoToWallTime(event.closeAt, timezone) : "",
    contactField: event?.contactField ?? "EMAIL",
    questions:
      event?.questions.map((q) => ({
        type: q.type,
        label: q.label,
        options: q.options,
        required: q.required,
      })) ?? [],
  };
}

export function EventForm({
  event,
  questionsLocked,
  onSubmit,
}: {
  event: MyEvent | null;
  /** 신청자가 생기면 질문 구조는 잠긴다 — 백엔드 계약과 동일. */
  questionsLocked: boolean;
  onSubmit: (draft: EventDraft) => Promise<void>;
}) {
  const t = useTranslations("events.form");
  const [form, setForm] = useState<FormState>(() => initialState(event));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!form.startsAtLocal) {
      setError(t("errors.startRequired"));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        descriptionMd: form.descriptionMd.trim() || null,
        startsAt: wallTimeToIso(form.startsAtLocal, form.timezone),
        endsAt: form.endsAtLocal ? wallTimeToIso(form.endsAtLocal, form.timezone) : null,
        timezone: form.timezone,
        locationText: form.locationText.trim() || null,
        locationUrl: form.locationUrl.trim() || null,
        onlineUrl: form.onlineUrl.trim() || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        closeAt: form.closeAtLocal ? wallTimeToIso(form.closeAtLocal, form.timezone) : null,
        contactField: form.contactField,
        questions: form.questions,
      });
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiError ? err.message : t("errors.generic"));
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Section>
        <Field label={t("title")} htmlFor="ef-title" required>
          <Input
            id="ef-title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={200}
            required
            placeholder={t("titlePlaceholder")}
          />
        </Field>
        <Field label={t("description")} htmlFor="ef-desc" hint={t("descriptionHint")}>
          <Textarea
            id="ef-desc"
            value={form.descriptionMd}
            onChange={(e) => set("descriptionMd", e.target.value)}
            rows={8}
            maxLength={50000}
            placeholder={t("descriptionPlaceholder")}
          />
        </Field>
      </Section>

      <Section title={t("whenTitle")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("startsAt")} htmlFor="ef-starts" required>
            <Input
              id="ef-starts"
              type="datetime-local"
              value={form.startsAtLocal}
              onChange={(e) => set("startsAtLocal", e.target.value)}
              required
            />
          </Field>
          <Field label={t("endsAt")} htmlFor="ef-ends">
            <Input
              id="ef-ends"
              type="datetime-local"
              value={form.endsAtLocal}
              onChange={(e) => set("endsAtLocal", e.target.value)}
            />
          </Field>
        </div>
        <Field label={t("timezone")} htmlFor="ef-tz">
          <select
            id="ef-tz"
            value={form.timezone}
            onChange={(e) => set("timezone", e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {(TIMEZONES.includes(form.timezone)
              ? TIMEZONES
              : [form.timezone, ...TIMEZONES]
            ).map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title={t("whereTitle")}>
        <Field label={t("locationText")} htmlFor="ef-loc">
          <Input
            id="ef-loc"
            value={form.locationText}
            onChange={(e) => set("locationText", e.target.value)}
            maxLength={200}
            placeholder={t("locationPlaceholder")}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("locationUrl")} htmlFor="ef-locurl" hint={t("locationUrlHint")}>
            <Input
              id="ef-locurl"
              type="url"
              value={form.locationUrl}
              onChange={(e) => set("locationUrl", e.target.value)}
              placeholder="https://maps.google.com/…"
            />
          </Field>
          <Field label={t("onlineUrl")} htmlFor="ef-online" hint={t("onlineUrlHint")}>
            <Input
              id="ef-online"
              type="url"
              value={form.onlineUrl}
              onChange={(e) => set("onlineUrl", e.target.value)}
              placeholder="https://meet.google.com/…"
            />
          </Field>
        </div>
      </Section>

      <Section title={t("limitsTitle")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("capacity")} htmlFor="ef-cap" hint={t("capacityHint")}>
            <Input
              id="ef-cap"
              type="number"
              min={1}
              max={10000}
              value={form.capacity}
              onChange={(e) => set("capacity", e.target.value)}
              placeholder={t("capacityPlaceholder")}
            />
          </Field>
          <Field label={t("closeAt")} htmlFor="ef-close" hint={t("closeAtHint")}>
            <Input
              id="ef-close"
              type="datetime-local"
              value={form.closeAtLocal}
              onChange={(e) => set("closeAtLocal", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title={t("formSectionTitle")}>
        {event == null ? (
          <Field label={t("contactField")} htmlFor="ef-contact" hint={t("contactFieldHint")}>
            <div className="flex gap-2">
              {CONTACT_FIELDS.map((field) => (
                <button
                  key={field}
                  type="button"
                  onClick={() => set("contactField", field)}
                  className={
                    form.contactField === field
                      ? "rounded-full border border-slate-900 bg-slate-900 px-3.5 py-1.5 text-[13px] font-medium text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                      : "rounded-full border border-slate-300 px-3.5 py-1.5 text-[13px] text-slate-600 hover:border-slate-500 dark:border-slate-700 dark:text-slate-300"
                  }
                >
                  {t(`contactFields.${field}`)}
                </button>
              ))}
            </div>
          </Field>
        ) : null}
        {questionsLocked ? (
          <p className="text-[12px] text-slate-500 dark:text-slate-400">{t("questionsLocked")}</p>
        ) : (
          <QuestionBuilder
            questions={form.questions}
            onChange={(questions) => set("questions", questions)}
          />
        )}
      </Section>

      {error ? (
        <p role="alert" className="text-[13px] font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || !form.title.trim()}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 text-[14px] font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {event ? t("save") : t("publish")}
      </button>
    </form>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      {title ? (
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</p> : null}
    </div>
  );
}
