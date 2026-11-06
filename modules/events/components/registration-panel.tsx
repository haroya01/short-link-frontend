"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { prewarmPowToken } from "@/lib/pow";
import { cn, inert } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { linksHref } from "@/lib/host";
import type { PublicEvent, RegistrationClosedReason, RegistrationResult } from "@/modules/events/api/events";
import { registerForEvent } from "@/modules/events/api/events";
import type { EventPhase } from "@/modules/events/lib/phase";
import { rememberRegistration, rememberedRegistration } from "@/modules/events/lib/remembered-registration";
import { RequiredMark } from "@/components/ui/required-mark";
import { AddToCalendarMenu } from "@/modules/profile/components/add-to-calendar-menu";

type Step = "idle" | "submitting" | "done";
type FieldKey = "name" | "contact" | "consent" | `q${number}`;

const SECTION = "mt-8";
const BIG_BUTTON = "h-12 w-full text-base font-semibold";
const INPUT = "h-12 text-base border-slate-500 dark:border-slate-500";

export function RegistrationPanel({
  event,
  phase,
  preview = false,
  onRegistered,
  onClosed,
}: {
  event: PublicEvent;
  phase: EventPhase;
  preview?: boolean;
  onRegistered?: (spotsLeft: number | null) => void;
  onClosed?: (reason: RegistrationClosedReason) => void;
}) {
  const t = useTranslations("events.public");
  const [step, setStep] = useState<Step>("idle");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [consented, setConsented] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [remembered, setRemembered] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!preview) setRemembered(rememberedRegistration(event.slug));
  }, [event.slug, preview]);

  if (step === "done" && result) {
    return <SuccessPanel event={event} cancelToken={result.cancelToken} />;
  }
  if (remembered) {
    return (
      <SuccessPanel
        event={event}
        cancelToken={remembered}
        returning
        onRegisterAnother={phase === "open" ? () => setRemembered(null) : undefined}
      />
    );
  }
  if (phase !== "open") {
    return <ClosedState message={closedMessage(t, phase)} reopens={phase === "full" || phase === "closed"} />;
  }

  const clearError = (key: FieldKey) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const validate = (): Partial<Record<FieldKey, string>> => {
    const found: Partial<Record<FieldKey, string>> = {};
    if (!name.trim()) found.name = t("errors.nameRequired");
    if (!contact.trim()) found.contact = t("errors.contactRequired");
    for (const question of event.questions) {
      if (question.required && !(answers[question.id] ?? "").trim()) {
        found[`q${question.id}`] = t(
          question.type === "SINGLE_CHOICE" ? "errors.choiceRequired" : "errors.answerRequired",
        );
      }
    }
    if (!consented) found.consent = t("errors.consentRequired");
    return found;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "submitting") return;
    setFormError(null);
    const found = validate();
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
      return;
    }
    setStep("submitting");
    try {
      const res = await registerForEvent(event.slug, { name, contact, answers });
      rememberRegistration(event.slug, res.cancelToken);
      setResult(res);
      setStep("done");
      onRegistered?.(res.spotsLeft);
    } catch (err) {
      setStep("idle");
      const code = err instanceof ApiError ? (err.detail as { code?: string }).code : undefined;
      if (code === "INVALID_CONTACT") setErrors({ contact: contactError(t, event.contactField) });
      else if (code === "EVENT_FULL") onClosed?.("FULL");
      else if (code === "EVENT_REGISTRATION_CLOSED") onClosed?.("CLOSED");
      else if (code === "EVENT_CANCELED") onClosed?.("CANCELED");
      else if (code === "ALREADY_REGISTERED") setFormError(t("errors.alreadyRegistered"));
      else setFormError(t("errors.generic"));
    }
  };

  return (
    <section id="register" className={SECTION}>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t("formTitle")}</h2>
      <form
        ref={formRef}
        onSubmit={submit}
        className="mt-4 flex flex-col gap-5"
        noValidate
        {...inert(preview)}
      >
        <Field label={t("nameLabel")} htmlFor="ev-name" required error={errors.name}>
          <Input
            id="ev-name"
            data-field="name"
            className={INPUT}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError("name");
            }}
            onFocus={() => prewarmPowToken()}
            autoComplete="name"
            maxLength={100}
            required
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "ev-name-error" : undefined}
            placeholder={t("namePlaceholder")}
          />
        </Field>
        <Field label={contactLabel(t, event.contactField)} htmlFor="ev-contact" required error={errors.contact}>
          <Input
            id="ev-contact"
            data-field="contact"
            className={INPUT}
            value={contact}
            onChange={(e) => {
              setContact(e.target.value);
              clearError("contact");
            }}
            type={event.contactField === "EMAIL" ? "email" : "text"}
            inputMode={event.contactField === "PHONE" ? "tel" : undefined}
            autoComplete={
              event.contactField === "EMAIL" ? "email" : event.contactField === "PHONE" ? "tel" : "off"
            }
            maxLength={254}
            required
            aria-invalid={errors.contact ? true : undefined}
            aria-describedby={errors.contact ? "ev-contact-error" : undefined}
            placeholder={contactPlaceholder(t, event.contactField)}
          />
        </Field>

        {event.questions.map((question) => {
          const key: FieldKey = `q${question.id}`;
          const id = `ev-q-${question.id}`;
          const error = errors[key];
          return (
            <Field key={question.id} label={question.label} htmlFor={id} required={question.required} error={error}>
              {question.type === "SINGLE_CHOICE" ? (
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label={question.label}
                  aria-describedby={error ? `${id}-error` : undefined}
                >
                  {question.options.map((option, i) => {
                    const selected = answers[question.id] === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        data-field={i === 0 ? key : undefined}
                        aria-pressed={selected}
                        onClick={() => {
                          setAnswers((prev) => ({ ...prev, [question.id]: selected ? "" : option }));
                          clearError(key);
                        }}
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
                  id={id}
                  data-field={key}
                  className={INPUT}
                  value={answers[question.id] ?? ""}
                  onChange={(e) => {
                    setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }));
                    clearError(key);
                  }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${id}-error` : undefined}
                  maxLength={500}
                />
              )}
            </Field>
          );
        })}

        <div className="flex flex-col gap-1.5">
          <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              data-field="consent"
              checked={consented}
              onChange={(e) => {
                setConsented(e.target.checked);
                clearError("consent");
              }}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? "ev-consent-error" : undefined}
              className="mt-1 h-6 w-6 shrink-0 cursor-pointer rounded border-slate-300 accent-slate-900 dark:accent-slate-100"
            />
            <span>{t("consent")}</span>
          </label>
          {errors.consent ? <FieldError id="ev-consent-error">{errors.consent}</FieldError> : null}
        </div>

        {formError ? (
          <p role="alert" className="text-[15px] font-medium leading-relaxed text-red-600 dark:text-red-400">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={step === "submitting"}
          className={cn(buttonVariants({ size: "xl" }), BIG_BUTTON)}
        >
          {step === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {step === "submitting" ? t("submitting") : t("submit")}
        </button>
      </form>
    </section>
  );
}

function SuccessPanel({
  event,
  cancelToken,
  returning = false,
  onRegisterAnother,
}: {
  event: PublicEvent;
  cancelToken: string;
  returning?: boolean;
  onRegisterAnother?: () => void;
}) {
  const t = useTranslations("events.public");
  const [copied, setCopied] = useState(false);
  const sectionRef = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    if (!returning) sectionRef.current?.focus();
  }, [returning]);
  const cancelUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}${window.location.pathname}?cancel=${cancelToken}`;

  return (
    <section
      id="register"
      ref={sectionRef}
      tabIndex={-1}
      aria-live="polite"
      aria-atomic="true"
      className={cn(SECTION, "outline-none")}
    >
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
        {returning ? t("alreadyRegisteredTitle") : t("successTitle")}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        {event.contactField === "EMAIL" ? t("successBodyEmail") : t("successBody")}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <AddToCalendarMenu
          event={{
            title: event.title,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            location: event.locationText ?? event.onlineUrl,
            description: null,
            url: typeof window === "undefined" ? null : `${window.location.origin}${window.location.pathname}`,
          }}
          uid={`event-${event.slug}@kurl.me`}
          filename={`${event.slug}.ics`}
          label={t("addToCalendar")}
          labels={{ google: t("calendarGoogle"), outlook: t("calendarOutlook"), ics: t("calendarIcs") }}
          className={buttonVariants({ size: "lg" })}
        />
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(cancelUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          {copied ? t("cancelLinkCopied") : t("copyCancelLink")}
        </button>
      </div>
      {onRegisterAnother ? (
        <button
          type="button"
          onClick={onRegisterAnother}
          className="mt-4 text-[14px] font-medium text-slate-600 underline-offset-[3px] hover:underline dark:text-slate-300"
        >
          {t("registerAnother")}
        </button>
      ) : null}
      <p className="mt-6 text-[14px] text-slate-500 dark:text-slate-400">
        {t("viralHook")}{" "}
        <a
          href={linksHref("/events/new?ref=event-success")}
          className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-[3px] hover:decoration-slate-500 dark:text-slate-300 dark:decoration-slate-600"
        >
          {t("viralCta")}
        </a>
      </p>
    </section>
  );
}

function ClosedState({ message, reopens }: { message: string; reopens: boolean }) {
  const t = useTranslations("events.public");
  return (
    <section id="register" className={SECTION}>
      <p role="status" className="text-[15px] font-medium leading-relaxed text-slate-800 dark:text-slate-200">
        {message}
      </p>
      {reopens ? (
        <button type="button" disabled className={cn(buttonVariants({ size: "xl" }), BIG_BUTTON, "mt-4")}>
          {t("submit")}
        </button>
      ) : null}
    </section>
  );
}

function closedMessage(t: (key: string) => string, phase: Exclude<EventPhase, "open">): string {
  if (phase === "canceled") return t("canceledNotice");
  if (phase === "ended") return t("endedNotice");
  if (phase === "full") return t("fullNotice");
  return t("closedNotice");
}

function Field({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[15px] font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required ? <RequiredMark /> : null}
      </label>
      {children}
      {error ? <FieldError id={`${htmlFor}-error`}>{error}</FieldError> : null}
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="text-[14px] font-medium text-red-600 dark:text-red-400">
      {children}
    </p>
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
