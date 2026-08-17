"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CalendarPlus, CheckCircle2, Copy, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { prewarmPowToken } from "@/lib/pow";
import { Input } from "@/components/ui/input";
import { linksHref } from "@/lib/host";
import type { PublicEvent, RegistrationResult } from "@/modules/events/api/events";
import { registerForEvent } from "@/modules/events/api/events";
import { googleCalendarUrl } from "@/modules/events/lib/format";

type Phase = "idle" | "submitting" | "done";

export function RegistrationPanel({
  event,
  onRegistered,
}: {
  event: PublicEvent;
  onRegistered: (spotsLeft: number | null) => void;
}) {
  const t = useTranslations("events.public");
  const [phase, setPhase] = useState<Phase>("idle");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegistrationResult | null>(null);

  if (event.status === "CANCELED") {
    return <ClosedNotice message={t("canceledNotice")} />;
  }
  if (!event.acceptingRegistrations && phase !== "done") {
    const full = event.spotsLeft != null && event.spotsLeft <= 0;
    return <ClosedNotice message={full ? t("fullNotice") : t("closedNotice")} />;
  }

  if (phase === "done" && result) {
    return <SuccessPanel event={event} result={result} />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase === "submitting") return;
    setError(null);
    for (const question of event.questions) {
      if (question.required && !(answers[question.id] ?? "").trim()) {
        setError(
          t(
            question.type === "SINGLE_CHOICE"
              ? "errors.choiceRequired"
              : "errors.answerRequired",
            { label: question.label },
          ),
        );
        return;
      }
    }
    if (!consented) {
      setError(t("errors.consentRequired"));
      return;
    }
    setPhase("submitting");
    try {
      const res = await registerForEvent(event.slug, { name, contact, answers });
      setResult(res);
      setPhase("done");
      onRegistered(res.spotsLeft);
    } catch (err) {
      setPhase("idle");
      if (err instanceof ApiError) {
        const code = (err.detail as { code?: string }).code;
        if (code === "EVENT_FULL") setError(t("errors.full"));
        else if (code === "ALREADY_REGISTERED") setError(t("errors.alreadyRegistered"));
        else if (code === "INVALID_CONTACT") setError(contactError(t, event.contactField));
        else if (code === "EVENT_REGISTRATION_CLOSED") setError(t("errors.closed"));
        else setError(t("errors.generic"));
      } else {
        setError(t("errors.generic"));
      }
    }
  };

  return (
    <section
      id="register"
      className="mt-9 border-t border-slate-200 pt-7 dark:border-slate-800"
    >
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
        {t("formTitle")}
      </h2>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4" noValidate>
        <Field label={t("nameLabel")} htmlFor="ev-name" required>
          <Input
            id="ev-name"
            className="h-12 text-base border-slate-500 dark:border-slate-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => prewarmPowToken()}
            autoComplete="name"
            maxLength={100}
            required
            placeholder={t("namePlaceholder")}
          />
        </Field>
        <Field label={contactLabel(t, event.contactField)} htmlFor="ev-contact" required>
          <Input
            id="ev-contact"
            className="h-12 text-base border-slate-500 dark:border-slate-500"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            type={event.contactField === "EMAIL" ? "email" : "text"}
            inputMode={event.contactField === "PHONE" ? "tel" : undefined}
            autoComplete={
              event.contactField === "EMAIL"
                ? "email"
                : event.contactField === "PHONE"
                  ? "tel"
                  : "off"
            }
            maxLength={254}
            required
            placeholder={contactPlaceholder(t, event.contactField)}
          />
        </Field>

        {event.questions.map((question) => (
          <Field
            key={question.id}
            label={question.label}
            htmlFor={`ev-q-${question.id}`}
            required={question.required}
          >
            {question.type === "SINGLE_CHOICE" ? (
              <div className="flex flex-wrap gap-2" role="group" aria-label={question.label}>
                {question.options.map((option) => {
                  const selected = answers[question.id] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [question.id]: selected ? "" : option,
                        }))
                      }
                      className={
                        selected
                          ? "min-h-11 rounded-full border border-slate-900 bg-slate-900 px-4 py-2.5 text-[15px] font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                          : "min-h-11 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-[15px] text-slate-700 transition-colors hover:border-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      }
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : (
              <Input
                id={`ev-q-${question.id}`}
                className="h-12 text-base border-slate-500 dark:border-slate-500"
                value={answers[question.id] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                }
                maxLength={500}
              />
            )}
          </Field>
        ))}

        <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-1 h-6 w-6 cursor-pointer rounded border-slate-300 accent-slate-900 dark:accent-slate-100"
          />
          <span>{t("consent")}</span>
        </label>

        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-red-50 px-3.5 py-3 text-[15px] font-medium leading-relaxed text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}

        <button
          type="submit"
          disabled={phase === "submitting" || !name.trim() || !contact.trim()}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-accent-600 text-base font-semibold text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {phase === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {phase === "submitting" ? t("submitting") : t("submit")}
        </button>
      </form>
    </section>
  );
}

function SuccessPanel({ event, result }: { event: PublicEvent; result: RegistrationResult }) {
  const t = useTranslations("events.public");
  const [copied, setCopied] = useState(false);
  const sectionRef = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    sectionRef.current?.focus();
  }, []);
  const cancelUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}${window.location.pathname}?cancel=${result.cancelToken}`;

  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      aria-live="polite"
      aria-atomic="true"
      className="mt-6 rounded-2xl border border-accent-200 bg-accent-50 p-5 outline-none dark:border-accent-900 dark:bg-accent-950/40"
    >
      <div className="flex items-center gap-2.5">
        <CheckCircle2 className="h-5 w-5 text-accent-600 dark:text-accent-400" />
        <h2 className="text-lg font-semibold text-accent-900 dark:text-accent-200">
          {t("successTitle")}
        </h2>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-accent-800 dark:text-accent-300">
        {event.contactField === "EMAIL" ? t("successBodyEmail") : t("successBody")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={googleCalendarUrl(event)}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 items-center gap-1.5 rounded-full bg-accent-600 px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-accent-500"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          {t("addToCalendar")}
        </a>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(cancelUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex min-h-11 items-center gap-1.5 rounded-full border border-accent-300 bg-white px-4 py-2 text-[14px] font-medium text-accent-800 transition-colors hover:bg-accent-100 dark:border-accent-800 dark:bg-accent-950 dark:text-accent-300"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? t("cancelLinkCopied") : t("copyCancelLink")}
        </button>
      </div>

      <div className="mt-5 border-t border-accent-200 pt-4 dark:border-accent-900">
        <p className="text-[14px] text-accent-700 dark:text-accent-400">{t("viralHook")}</p>
        <a
          href={linksHref("/events/new?ref=event-success")}
          className="mt-2 inline-flex min-h-11 items-center rounded-full border border-accent-300 bg-white px-4 py-2 text-[14px] font-semibold text-accent-800 transition-colors hover:bg-accent-100 dark:border-accent-800 dark:bg-accent-950 dark:text-accent-200"
        >
          {t("viralCta")}
        </a>
      </div>
    </section>
  );
}

function ClosedNotice({ message }: { message: string }) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-100 p-5 text-center text-[15px] font-medium leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      {message}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[15px] font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function contactLabel(t: (k: string) => string, field: PublicEvent["contactField"]): string {
  if (field === "PHONE") return t("contactPhone");
  if (field === "KAKAO") return t("contactKakao");
  if (field === "LINE") return t("contactLine");
  if (field === "INSTAGRAM") return t("contactInstagram");
  return t("contactEmail");
}

function contactPlaceholder(t: (k: string) => string, field: PublicEvent["contactField"]): string {
  if (field === "PHONE") return t("contactPhonePlaceholder");
  if (field === "KAKAO") return t("contactKakaoPlaceholder");
  if (field === "LINE") return t("contactLinePlaceholder");
  if (field === "INSTAGRAM") return t("contactInstagramPlaceholder");
  return t("contactEmailPlaceholder");
}

function contactError(t: (k: string) => string, field: PublicEvent["contactField"]): string {
  if (field === "PHONE") return t("errors.invalidPhone");
  if (field === "KAKAO") return t("errors.invalidKakao");
  if (field === "LINE") return t("errors.invalidLine");
  if (field === "INSTAGRAM") return t("errors.invalidInstagram");
  return t("errors.invalidEmail");
}
