"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { prewarmPowToken } from "@/lib/pow";
import { Input } from "@/components/ui/input";
import { linksHref } from "@/lib/host";
import type { PublicEvent, RegistrationResult } from "@/modules/events/api/events";
import { registerForEvent } from "@/modules/events/api/events";

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
        setError(t("errors.answerRequired", { label: question.label }));
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
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">
        {t("formTitle")}
      </h2>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4" noValidate>
        <Field label={t("nameLabel")} htmlFor="ev-name" required>
          <Input
            id="ev-name"
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
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={question.label}>
                {question.options.map((option) => {
                  const selected = answers[question.id] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [question.id]: selected ? "" : option,
                        }))
                      }
                      className={
                        selected
                          ? "rounded-full border border-slate-900 bg-slate-900 px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                          : "rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-[13px] text-slate-700 transition-colors hover:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
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
                value={answers[question.id] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                }
                maxLength={500}
              />
            )}
          </Field>
        ))}

        <label className="flex items-start gap-2.5 text-[12px] leading-snug text-slate-500 dark:text-slate-400">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-slate-900 dark:accent-slate-100"
          />
          <span>{t("consent")}</span>
        </label>

        {error ? (
          <p role="alert" className="text-[13px] font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={phase === "submitting" || !name.trim() || !contact.trim()}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 text-[14px] font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
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
  const cancelUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}${window.location.pathname}?cancel=${result.cancelToken}`;

  return (
    <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
      <div className="flex items-center gap-2.5">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-[15px] font-semibold text-emerald-900 dark:text-emerald-200">
          {t("successTitle")}
        </h2>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-emerald-800 dark:text-emerald-300">
        {event.contactField === "EMAIL" ? t("successBodyEmail") : t("successBody")}
      </p>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(cancelUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="mt-3 flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-[12px] font-medium text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      >
        <Copy className="h-3.5 w-3.5" />
        {copied ? t("cancelLinkCopied") : t("copyCancelLink")}
      </button>

      <div className="mt-5 border-t border-emerald-200 pt-4 dark:border-emerald-900">
        <p className="text-[12px] text-emerald-700 dark:text-emerald-400">{t("viralHook")}</p>
        <a
          href={linksHref("/events/new?ref=event-success")}
          className="mt-1.5 inline-block text-[13px] font-semibold text-emerald-900 underline underline-offset-2 dark:text-emerald-200"
        >
          {t("viralCta")}
        </a>
      </div>
    </section>
  );
}

function ClosedNotice({ message }: { message: string }) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-100 p-5 text-center text-[13px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
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
        className="text-[12px] font-medium text-slate-600 dark:text-slate-400"
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
  return t("contactEmail");
}

function contactPlaceholder(t: (k: string) => string, field: PublicEvent["contactField"]): string {
  if (field === "PHONE") return t("contactPhonePlaceholder");
  if (field === "KAKAO") return t("contactKakaoPlaceholder");
  return t("contactEmailPlaceholder");
}

function contactError(t: (k: string) => string, field: PublicEvent["contactField"]): string {
  if (field === "PHONE") return t("errors.invalidPhone");
  if (field === "KAKAO") return t("errors.invalidKakao");
  return t("errors.invalidEmail");
}
