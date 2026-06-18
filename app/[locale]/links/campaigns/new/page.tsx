"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { createCampaign } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { CampaignPostEndAction } from "@/types";

type StartMode = "now" | "schedule";

export default function NewCampaignPage() {
  const { authenticated, ready } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("campaignApp.new");

  const [name, setName] = useState("");
  const [startMode, setStartMode] = useState<StartMode>("now");
  const [startsAtLocal, setStartsAtLocal] = useState(toLocalInput(new Date()));
  const [endsAtLocal, setEndsAtLocal] = useState(toLocalInput(addDays(new Date(), 7)));
  const [defaultDestinationUrl, setDefaultDestinationUrl] = useState("");
  const [postEndAction, setPostEndAction] = useState<CampaignPostEndAction>("KEEP");
  const [postEndDestinationUrl, setPostEndDestinationUrl] = useState("");
  const [postEndMessage, setPostEndMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (ready && !authenticated) {
    return (
      <div className="container max-w-md py-20 text-center">
        <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
          {t("loginRequired")}
        </h1>
        <Link href="/login" className="mt-6 inline-block">
          <Button>{t("goToLogin")}</Button>
        </Link>
      </div>
    );
  }

  const redirectRequired = postEndAction === "REDIRECT";
  const canSubmit =
    name.trim().length > 0 &&
    (!redirectRequired || postEndDestinationUrl.trim().length > 0) &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const created = await createCampaign({
        name: name.trim(),
        startsAt: startMode === "schedule" ? new Date(startsAtLocal).toISOString() : undefined,
        endsAt: new Date(endsAtLocal).toISOString(),
        defaultDestinationUrl: defaultDestinationUrl.trim() || undefined,
        postEndAction,
        postEndDestinationUrl: redirectRequired ? postEndDestinationUrl.trim() : undefined,
        postEndMessage:
          postEndAction === "EXPIRE" && postEndMessage.trim().length > 0
            ? postEndMessage.trim()
            : undefined,
      });
      toast(t("created"), "success");
      router.push(`/campaigns/${created.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : t("createFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container max-w-2xl space-y-6 py-10">
      <div>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {t("backToList")}
        </Link>
        <h1 className="mt-2 text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("intro")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
      >
        <Field label={t("nameLabel")} required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            maxLength={255}
            required
          />
        </Field>

        <Field
          label={t("startLabel")}
          hint={t("startHint")}
        >
          <div className="grid grid-cols-2 gap-2">
            <Segmented
              active={startMode === "now"}
              onClick={() => setStartMode("now")}
              label={t("startNow")}
            />
            <Segmented
              active={startMode === "schedule"}
              onClick={() => setStartMode("schedule")}
              label={t("startSchedule")}
            />
          </div>
          {startMode === "schedule" && (
            <Input
              type="datetime-local"
              value={startsAtLocal}
              onChange={(e) => setStartsAtLocal(e.target.value)}
              className="mt-2"
            />
          )}
        </Field>

        <Field label={t("endLabel")} required>
          <Input
            type="datetime-local"
            value={endsAtLocal}
            onChange={(e) => setEndsAtLocal(e.target.value)}
            required
          />
          <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">
            {t("endHint")}
          </p>
        </Field>

        <Field
          label={t("defaultUrlLabel")}
          hint={t("defaultUrlHint")}
        >
          <Input
            type="url"
            value={defaultDestinationUrl}
            onChange={(e) => setDefaultDestinationUrl(e.target.value)}
            placeholder="https://example.com/landing"
          />
        </Field>

        <Field label={t("postEndLabel")} required>
          <div className="space-y-2">
            <PolicyOption
              active={postEndAction === "KEEP"}
              onClick={() => setPostEndAction("KEEP")}
              title={t("policy.keepTitle")}
              body={t("policy.keepBody")}
            />
            <PolicyOption
              active={postEndAction === "EXPIRE"}
              onClick={() => setPostEndAction("EXPIRE")}
              title={t("policy.expireTitle")}
              body={t("policy.expireBody")}
            />
            {postEndAction === "EXPIRE" && (
              <div className="ml-6 mt-2 space-y-1.5">
                <textarea
                  value={postEndMessage}
                  onChange={(e) => setPostEndMessage(e.target.value.slice(0, 500))}
                  placeholder={t("messagePlaceholder")}
                  rows={3}
                  className="block w-full resize-y rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[13px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/20"
                />
                <p className="text-[12px] text-slate-500 dark:text-slate-400">
                  {t("messageHint")}{" "}
                  <span className="tabular-nums">{postEndMessage.length}/500</span>
                </p>
              </div>
            )}
            <PolicyOption
              active={postEndAction === "REDIRECT"}
              onClick={() => setPostEndAction("REDIRECT")}
              title={t("policy.redirectTitle")}
              body={t("policy.redirectBody")}
            />
          </div>
          {redirectRequired && (
            <div className="mt-3">
              <Input
                type="url"
                value={postEndDestinationUrl}
                onChange={(e) => setPostEndDestinationUrl(e.target.value)}
                placeholder="https://example.com/after-event"
                required
              />
              <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">
                {t("redirectHint")}
              </p>
            </div>
          )}
        </Field>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
          <Link href="/campaigns">
            <Button type="button" variant="outline">
              {t("cancel")}
            </Button>
          </Link>
          <Button type="submit" variant="accent" disabled={!canSubmit}>
            {submitting ? t("creating") : t("submit")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[13px] font-medium text-slate-900 dark:text-slate-100">
        {label}
        {required && <span className="ml-1 text-accent-700 dark:text-accent-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-[12px] text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

function Segmented({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "h-10 rounded-xl border text-[13px] font-medium transition-colors " +
        (active
          ? "border-accent-600 bg-accent-50 dark:bg-accent-500/10 text-accent-700 dark:text-accent-400"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50")
      }
    >
      {label}
    </button>
  );
}

function PolicyOption({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "w-full rounded-xl border px-4 py-3 text-left transition-colors " +
        (active
          ? "border-accent-600 bg-accent-50/40 dark:bg-accent-500/10"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50")
      }
    >
      <div className="flex items-center gap-2">
        <span
          className={
            "grid h-4 w-4 place-items-center rounded-full border " +
            (active ? "border-accent-600 bg-accent-600" : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900")
          }
        >
          {active && <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-slate-900" />}
        </span>
        <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">{title}</span>
      </div>
      <p className="mt-1.5 pl-6 text-[12px] leading-snug text-slate-500 dark:text-slate-400">{body}</p>
    </button>
  );
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}
