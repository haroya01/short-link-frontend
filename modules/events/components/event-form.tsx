"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { Markdown } from "@/modules/blog/components/markdown";
import type { ContactField, EventDraft, MyEvent, QuestionSpec } from "@/modules/events/api/events";
import { commitCover, presignCover } from "@/modules/events/api/events";
import { isoToWallTime, wallTimeToIso } from "@/modules/events/lib/format";
import { LocationField } from "./location-field";
import { QuestionBuilder } from "./question-builder";

const TIMEZONES = ["Asia/Tokyo", "Asia/Seoul", "UTC", "America/Los_Angeles", "Europe/London"];
const CONTACT_FIELDS: ContactField[] = ["EMAIL", "PHONE", "KAKAO", "LINE", "INSTAGRAM"];

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

  // 새 이벤트의 시작 기본값 = 다음 주 19:00 (iOS 생성 폼과 동일) — 제목만 적으면 발행되는
  // 폼이 되도록. 마운트 후에 채우는 건 하이드레이션 불일치(서버/클라이언트 now 차이) 회피.
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
        {event ? <CoverField eventId={event.id} initialUrl={event.coverImageUrl} /> : null}
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
        <DescriptionField
          value={form.descriptionMd}
          onChange={(value) => set("descriptionMd", value)}
        />
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
        {/* 타임존은 기기값이 거의 항상 정답 — 풀폭 필드 대신 한 줄 조용한 행으로 강등. */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="ef-tz"
            className="text-[12px] font-medium text-slate-500 dark:text-slate-400"
          >
            {t("timezone")}
          </label>
          <select
            id="ef-tz"
            value={form.timezone}
            onChange={(e) => set("timezone", e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 font-mono text-[12px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
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
        </div>
      </Section>

      <Section title={t("whereTitle")}>
        <LocationField
          text={form.locationText}
          url={form.locationUrl}
          onTextChange={(value) => set("locationText", value)}
          onUrlChange={(value) => set("locationUrl", value)}
        />
        <Field label={t("onlineUrl")} htmlFor="ef-online" hint={t("onlineUrlHint")}>
          <Input
            id="ef-online"
            type="url"
            value={form.onlineUrl}
            onChange={(e) => set("onlineUrl", e.target.value)}
            placeholder="https://meet.google.com/…"
          />
        </Field>
      </Section>

      <CollapsibleSection
        title={t("limitsTitle")}
        defaultOpen={event != null && (event.capacity != null || event.closeAt != null)}
      >
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
      </CollapsibleSection>

      <CollapsibleSection
        title={t("formSectionTitle")}
        defaultOpen={event != null && event.questions.length > 0}
      >
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
      </CollapsibleSection>

      {error ? (
        <p role="alert" className="text-[13px] font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || !form.title.trim()}
        className="flex h-11 items-center justify-center gap-2 rounded-full bg-accent-600 text-[14px] font-semibold text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {event ? t("save") : t("publish")}
      </button>
    </form>
  );
}

/** 설명 = 마크다운. 탭 전환 없이 **치는 즉시** 아래에 렌더된다 — 블로그와 같은 렌더러라
 *  공개 페이지와 결과가 1:1 로 같다. 내용이 없으면 미리보기 영역 자체를 안 그린다(조용함). */
function DescriptionField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("events.form");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="ef-desc" className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
        {t("description")}
      </label>
      {/* 빈 8줄 상자가 첫 폴드를 다 먹던 것 — 4줄로 시작하고, 내용이 붙으면 미리보기가
          아래로 자란다. */}
      <Textarea
        id="ef-desc"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        maxLength={50000}
        placeholder={t("descriptionPlaceholder")}
      />
      {value.trim() ? (
        <div className="rounded-lg border border-slate-200 px-3.5 py-3 dark:border-slate-700">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-accent-700 dark:text-accent-500">
            {t("descPreview")}
          </p>
          <div className="prose-text-block text-slate-800 dark:text-slate-200">
            <Markdown>{value}</Markdown>
          </div>
        </div>
      ) : null}
      <p className="text-[11px] text-slate-400 dark:text-slate-500">{t("descriptionHint")}</p>
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-slate-200 pt-6 first:border-t-0 first:pt-0 dark:border-slate-800">
      {title ? (
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-accent-700 dark:text-accent-500">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

/** 선택 설정은 접어서 첫 발행 마찰을 줄인다 — 제목+일시만으로도 발행 가능해야 한다. */
function CollapsibleSection({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("events.form");
  return (
    <details
      open={defaultOpen}
      className="group border-t border-slate-200 pt-1 dark:border-slate-800"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[11px] font-semibold uppercase tracking-widest text-accent-700 dark:text-accent-500 [&::-webkit-details-marker]:hidden">
        {title}
        <span className="flex items-center gap-1.5 text-[11px] font-medium normal-case tracking-normal text-slate-400 dark:text-slate-500">
          {t("optional")}
          <span className="text-slate-300 transition-transform group-open:rotate-180 dark:text-slate-600">
            ▾
          </span>
        </span>
      </summary>
      <div className="flex flex-col gap-4 pb-5">{children}</div>
    </details>
  );
}

function CoverField({ eventId, initialUrl }: { eventId: number; initialUrl: string | null }) {
  const t = useTranslations("events.form");
  const [url, setUrl] = useState<string | null>(initialUrl);
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
      setUrl(committed.coverImageUrl);
    } catch {
      setError(true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
        {t("cover")}
      </span>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="aspect-[2/1] w-full rounded-2xl object-cover" />
      ) : null}
      <label className="flex h-9 w-fit cursor-pointer items-center rounded-lg border border-slate-300 px-3 text-[12px] font-medium text-slate-600 transition-colors hover:border-slate-500 dark:border-slate-700 dark:text-slate-300">
        {uploading ? t("coverUploading") : url ? t("coverReplace") : t("coverUpload")}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </label>
      {error ? (
        <p className="text-[11px] text-red-500">{t("coverFailed")}</p>
      ) : (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{t("coverHint")}</p>
      )}
    </div>
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
