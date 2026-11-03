"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Markdown as MarkdownType } from "@/modules/blog/components/markdown";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { RequiredMark } from "@/components/ui/required-mark";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { useApiErrorMessage } from "@/lib/error-messages";
import { cn } from "@/lib/utils";
import type { ContactField, EventDraft, MyEvent, PublicEvent, QuestionSpec } from "@/modules/events/api/events";
import { commitCover, presignCover } from "@/modules/events/api/events";
import { isoToWallTime, wallTimeToIso } from "@/modules/events/lib/format";
import {
  eventFormErrors,
  FIELD_ORDER,
  serverFieldErrors,
  type EventFormErrors,
  type EventFormField,
} from "@/modules/events/lib/form-rules";
import { EventPageView } from "./event-page-view";
import { LocationField } from "./location-field";
import { QuestionBuilder } from "./question-builder";

const TIMEZONES = ["Asia/Tokyo", "Asia/Seoul", "UTC", "America/Los_Angeles", "Europe/London"];
const CONTACT_FIELDS: Record<"ko" | "other", ContactField[]> = {
  ko: ["EMAIL", "PHONE", "KAKAO", "LINE", "INSTAGRAM"],
  other: ["EMAIL", "PHONE", "LINE", "INSTAGRAM", "KAKAO"],
};
const FIELD_ID: Record<EventFormField, string> = {
  title: "ef-title",
  startsAt: "ef-starts",
  endsAt: "ef-ends",
  capacity: "ef-cap",
  closeAt: "ef-close",
};
const TABS = ["edit", "preview"] as const;
type Tab = (typeof TABS)[number];

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

function wallIso(local: string, timezone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)) return null;
  return wallTimeToIso(local, timezone);
}

export function EventForm({
  event,
  questionsLocked,
  title,
  subtitle,
  onSubmit,
}: {
  event: MyEvent | null;
  /** 신청자가 생기면 질문 구조는 잠긴다 — 백엔드 계약과 동일. */
  questionsLocked: boolean;
  title: string;
  subtitle?: string;
  onSubmit: (draft: EventDraft) => Promise<void>;
}) {
  const t = useTranslations("events.form");
  const locale = useLocale();
  const errorMessage = useApiErrorMessage();
  const { me } = useAuth();
  const [form, setForm] = useState<FormState>(() => initialState(event));
  const [coverUrl, setCoverUrl] = useState<string | null>(event?.coverImageUrl ?? null);
  const [touched, setTouched] = useState<Partial<Record<EventFormField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<EventFormErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("edit");
  const [now] = useState(() => Date.now());

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setServerErrors({});
  };
  const touch = (field: EventFormField) => setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));

  // 기본 시작은 다음 주 19:00(iOS 생성 폼과 같음). 서버와 클라이언트의 now 가 달라 마운트 뒤에 채운다.
  useEffect(() => {
    if (event != null) return;
    setForm((prev) => {
      if (prev.startsAtLocal) return prev;
      const base = new Date();
      base.setDate(base.getDate() + 7);
      base.setHours(19, 0, 0, 0);
      const pad = (n: number) => String(n).padStart(2, "0");
      const wall = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
      return { ...prev, startsAtLocal: wall };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errors = eventFormErrors(form);
  const shown = (field: EventFormField) => {
    const code = (touched[field] && errors[field]) || serverErrors[field];
    return code ? t(`errors.${code}`) : undefined;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setTouched(Object.fromEntries(FIELD_ORDER.map((field) => [field, true])));
    const first = FIELD_ORDER.find((field) => errors[field]);
    if (first) {
      document.getElementById(FIELD_ID[first])?.focus();
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
        ...(questionsLocked ? {} : { questions: form.questions }),
      });
    } catch (err) {
      setBusy(false);
      const pinned = err instanceof ApiError ? serverFieldErrors(err.detail, form.endsAtLocal !== "") : {};
      const field = FIELD_ORDER.find((f) => pinned[f]);
      if (field) {
        setServerErrors(pinned);
        document.getElementById(FIELD_ID[field])?.focus();
      } else {
        setError(errorMessage(err, t("errors.generic")));
      }
    }
  };

  const capacity = errors.capacity || !form.capacity ? null : Number(form.capacity);
  const preview: PublicEvent = {
    slug: event?.slug ?? "preview",
    title: form.title.trim() || t("untitled"),
    descriptionMd: null,
    coverImageUrl: coverUrl,
    startsAt: wallIso(form.startsAtLocal, form.timezone) ?? "",
    endsAt: wallIso(form.endsAtLocal, form.timezone),
    timezone: form.timezone,
    locationText: form.locationText.trim() || null,
    locationUrl: form.locationUrl.trim() || null,
    onlineUrl: form.onlineUrl.trim() || null,
    capacity,
    spotsLeft: capacity == null ? null : capacity - (event?.registrationCount ?? 0),
    closeAt: wallIso(form.closeAtLocal, form.timezone),
    contactField: form.contactField,
    status: event?.status ?? "OPEN",
    acceptingRegistrations: true,
    attending: event?.registrationCount ?? 0,
    organizerName: me?.username ?? null,
    organizerAvatarUrl: null,
    questions: form.questions.map((q, i) => ({
      id: i + 1,
      type: q.type,
      label: q.label.trim() || t("questionLabel", { n: i + 1 }),
      options: (q.options ?? []).filter((o) => o.trim()),
      required: q.required,
    })),
  };

  const showTab = (next: Tab) => {
    setTab(next);
    const anchor = document.getElementById("ef-tabs-anchor");
    if (anchor && anchor.getBoundingClientRect().top < 0) anchor.scrollIntoView({ block: "start" });
  };

  return (
    <div>
      <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
        {title}
      </h1>
      {subtitle ? <p className="mt-1 text-[14px] text-slate-500 dark:text-slate-400">{subtitle}</p> : null}

      <div id="ef-tabs-anchor" className="scroll-mt-14" />
      <div
        role="tablist"
        aria-label={t("viewTabs")}
        className="sticky top-14 z-10 mt-5 flex gap-1 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950 lg:hidden"
      >
        {TABS.map((key, index) => {
          const selected = tab === key;
          return (
            <button
              key={key}
              id={`ef-tab-${key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`ef-panel-${key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => showTab(key)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const next = TABS[(index + 1) % TABS.length];
                showTab(next);
                document.getElementById(`ef-tab-${next}`)?.focus();
              }}
              className={cn(
                "relative -mb-px min-h-11 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600",
                selected
                  ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
              )}
            >
              {t(`tabs.${key}`)}
            </button>
          );
        })}
      </div>

      <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-12">
        <form
          id="ef-panel-edit"
          role="tabpanel"
          aria-labelledby="ef-tab-edit"
          onSubmit={submit}
          noValidate
          className={cn("min-w-0", tab === "preview" && "max-lg:hidden")}
        >
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            <span aria-hidden>* </span>
            {t("requiredNote")}
          </p>

          <Section>
            {event ? (
              <CoverField eventId={event.id} url={coverUrl} onChange={setCoverUrl} />
            ) : null}
            <Field label={t("title")} htmlFor="ef-title" required error={shown("title")}>
              <Input
                id="ef-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                onBlur={() => touch("title")}
                maxLength={200}
                required
                aria-invalid={shown("title") ? true : undefined}
                aria-describedby={shown("title") ? "ef-title-error" : undefined}
                placeholder={t("titlePlaceholder")}
              />
            </Field>
            <Field label={t("description")} htmlFor="ef-desc">
              <Textarea
                id="ef-desc"
                value={form.descriptionMd}
                onChange={(e) => set("descriptionMd", e.target.value)}
                rows={5}
                maxLength={50000}
                placeholder={t("descriptionPlaceholder")}
              />
            </Field>
          </Section>

          <Section title={t("whenTitle")} id="ef-when">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label={t("startsAt")} htmlFor="ef-starts" required error={shown("startsAt")}>
                <Input
                  id="ef-starts"
                  type="datetime-local"
                  value={form.startsAtLocal}
                  onChange={(e) => set("startsAtLocal", e.target.value)}
                  onBlur={() => touch("startsAt")}
                  required
                  aria-invalid={shown("startsAt") ? true : undefined}
                  aria-describedby={shown("startsAt") ? "ef-starts-error" : undefined}
                />
              </Field>
              <Field label={t("endsAt")} htmlFor="ef-ends" error={shown("endsAt")}>
                <Input
                  id="ef-ends"
                  type="datetime-local"
                  value={form.endsAtLocal}
                  min={form.startsAtLocal || undefined}
                  onChange={(e) => set("endsAtLocal", e.target.value)}
                  onBlur={() => touch("endsAt")}
                  aria-invalid={shown("endsAt") ? true : undefined}
                  aria-describedby={shown("endsAt") ? "ef-ends-error" : undefined}
                />
              </Field>
            </div>
            <Field label={t("timezone")} htmlFor="ef-tz">
              <select
                id="ef-tz"
                value={form.timezone}
                onChange={(e) => set("timezone", e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:w-1/2"
              >
                {(TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES]).map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </Field>
          </Section>

          <Section title={t("whereTitle")} id="ef-where">
            <LocationField
              labelledBy="ef-where-title"
              text={form.locationText}
              url={form.locationUrl}
              onTextChange={(value) => set("locationText", value)}
              onUrlChange={(value) => set("locationUrl", value)}
            />
            <Field label={t("onlineUrl")} htmlFor="ef-online">
              <Input
                id="ef-online"
                type="url"
                value={form.onlineUrl}
                onChange={(e) => set("onlineUrl", e.target.value)}
                placeholder="https://meet.google.com/…"
              />
            </Field>
          </Section>

          <Section title={t("limitsTitle")} id="ef-limits">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label={t("capacity")} htmlFor="ef-cap" hint={t("capacityHint")} error={shown("capacity")}>
                <Input
                  id="ef-cap"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={10000}
                  value={form.capacity}
                  onChange={(e) => set("capacity", e.target.value)}
                  onBlur={() => touch("capacity")}
                  aria-invalid={shown("capacity") ? true : undefined}
                  aria-describedby={shown("capacity") ? "ef-cap-error" : "ef-cap-hint"}
                  placeholder={t("capacityPlaceholder")}
                />
              </Field>
              <Field label={t("closeAt")} htmlFor="ef-close" error={shown("closeAt")}>
                <Input
                  id="ef-close"
                  type="datetime-local"
                  value={form.closeAtLocal}
                  max={form.endsAtLocal || form.startsAtLocal || undefined}
                  onChange={(e) => set("closeAtLocal", e.target.value)}
                  onBlur={() => touch("closeAt")}
                  aria-invalid={shown("closeAt") ? true : undefined}
                  aria-describedby={shown("closeAt") ? "ef-close-error" : undefined}
                />
              </Field>
            </div>
          </Section>

          <Section title={t("formSectionTitle")} id="ef-ask">
            {event == null ? (
              <Field label={t("contactField")} htmlFor="ef-contact" hint={t("contactFieldHint")} group>
                <div
                  role="group"
                  aria-labelledby="ef-contact-label"
                  aria-describedby="ef-contact-hint"
                  className="flex flex-wrap gap-2"
                >
                  {CONTACT_FIELDS[locale === "ko" ? "ko" : "other"].map((field) => (
                    <button
                      key={field}
                      type="button"
                      aria-pressed={form.contactField === field}
                      onClick={() => set("contactField", field)}
                      className={
                        form.contactField === field
                          ? "min-h-9 rounded-full border border-slate-900 bg-slate-900 px-3.5 py-1.5 text-[13px] font-medium text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                          : "min-h-9 rounded-full border border-slate-300 px-3.5 py-1.5 text-[13px] text-slate-600 transition-colors hover:border-slate-500 dark:border-slate-700 dark:text-slate-300"
                      }
                    >
                      {t(`contactFields.${field}`)}
                    </button>
                  ))}
                </div>
              </Field>
            ) : null}
            {questionsLocked ? (
              <p className="text-[13px] text-slate-500 dark:text-slate-400">{t("questionsLocked")}</p>
            ) : (
              <QuestionBuilder questions={form.questions} onChange={(questions) => set("questions", questions)} />
            )}
          </Section>

          <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
            {error ? (
              <p role="alert" className="text-[14px] font-medium text-red-600 dark:text-red-400">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={busy} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {event ? t("save") : t("publish")}
            </button>
          </div>
        </form>

        <aside
          id="ef-panel-preview"
          role="tabpanel"
          aria-labelledby="ef-tab-preview"
          className={cn("min-w-0 lg:sticky lg:top-20", tab === "edit" && "max-lg:hidden")}
        >
          <p className="mb-3 hidden text-[13px] font-medium text-slate-500 dark:text-slate-400 lg:block">
            {t("previewLabel")}
          </p>
          <div
            data-testid="event-preview"
            className="lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-slate-200 lg:p-6 lg:dark:border-slate-800"
          >
            <EventPageView
              event={preview}
              now={now}
              heading="h2"
              preview
              description={form.descriptionMd.trim() ? <DescriptionPreview value={form.descriptionMd} /> : null}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

/** 공개 페이지(/e/[slug])와 같은 렌더러여야 미리보기가 결과와 같다. 구문 강조까지 실려 무거워서 첫 입력 때 불러온다. */
function DescriptionPreview({ value }: { value: string }) {
  const [Markdown, setMarkdown] = useState<typeof MarkdownType | null>(null);
  useEffect(() => {
    let live = true;
    void import("@/modules/blog/components/markdown").then((m) => {
      if (live) setMarkdown(() => m.Markdown);
    });
    return () => {
      live = false;
    };
  }, []);
  return Markdown ? <Markdown>{value}</Markdown> : <p className="whitespace-pre-line">{value}</p>;
}

function Section({ title, id, children }: { title?: string; id?: string; children: ReactNode }) {
  return (
    <section
      className="mt-8 flex flex-col gap-5 border-t border-slate-200 pt-8 first-of-type:mt-6 first-of-type:border-t-0 first-of-type:pt-0 dark:border-slate-800"
    >
      {title ? (
        <h2 id={`${id}-title`} className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

function CoverField({
  eventId,
  url,
  onChange,
}: {
  eventId: number;
  url: string | null;
  onChange: (url: string) => void;
}) {
  const t = useTranslations("events.form");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    setError(false);
    try {
      const presigned = await presignCover(eventId, file.type);
      const put = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("upload failed");
      const committed = await commitCover(eventId, presigned.key);
      onChange(committed.coverImageUrl);
    } catch {
      setError(true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[14px] font-medium text-slate-800 dark:text-slate-200">{t("cover")}</span>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="aspect-[2/1] w-full rounded-2xl object-cover" />
      ) : null}
      <label className={cn(buttonVariants({ variant: "outline", size: "md" }), "w-fit cursor-pointer")}>
        {uploading ? t("coverUploading") : url ? t("coverReplace") : t("coverUpload")}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </label>
      {error ? (
        <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{t("coverFailed")}</p>
      ) : (
        <p className="text-[13px] text-slate-500 dark:text-slate-400">{t("coverHint")}</p>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  required,
  error,
  group = false,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  error?: string;
  group?: boolean;
  children: ReactNode;
}) {
  const Label = group ? "span" : "label";
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        id={group ? `${htmlFor}-label` : undefined}
        htmlFor={group ? undefined : htmlFor}
        className="text-[14px] font-medium text-slate-800 dark:text-slate-200"
      >
        {label}
        {required ? <RequiredMark /> : null}
      </Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-[13px] font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-[13px] text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
