"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, Trash2, Webhook } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import {
  ALL_BLOG_WEBHOOK_EVENTS,
  type BlogWebhookEvent,
  type BlogWebhookSummary,
  deleteBlogWebhook,
  listBlogWebhooks,
  registerBlogWebhook,
  updateBlogWebhook,
} from "@/modules/blog/api/webhooks";
import { SkeletonRows } from "@/modules/blog/components/skeleton";

export default function BlogWebhooksPage() {
  const t = useTranslations("blogWebhooks");
  const { ready, authenticated } = useAuth();
  const [hooks, setHooks] = useState<BlogWebhookSummary[] | null>(null);

  useEffect(() => {
    if (!ready || !authenticated) return;
    listBlogWebhooks()
      .then(setHooks)
      .catch(() => setHooks([]));
  }, [ready, authenticated]);

  if (!ready) return null;
  if (!authenticated) {
    return <main className="px-6 py-12 text-slate-600 dark:text-slate-300">{t("loginRequired")}</main>;
  }

  function refresh() {
    listBlogWebhooks()
      .then(setHooks)
      .catch(() => {});
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("title")}</h1>
      <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{t("subtitle")}</p>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("connected")}</h2>
        {hooks === null ? (
          <SkeletonRows count={2} />
        ) : hooks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
            {t("empty")}
          </p>
        ) : (
          <ul className="space-y-3">
            {hooks.map((h) => (
              <WebhookRow key={h.id} hook={h} onChanged={refresh} />
            ))}
          </ul>
        )}
      </section>

      <CreateForm onCreated={refresh} disabled={(hooks?.length ?? 0) >= 5} />
    </main>
  );
}

const FORMAT_LABEL: Record<string, string> = {
  GENERIC: "JSON · HMAC",
  DISCORD: "Discord",
  SLACK: "Slack",
};

function WebhookRow({ hook, onChanged }: { hook: BlogWebhookSummary; onChanged: () => void }) {
  const t = useTranslations("blogWebhooks");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  function toggleEvent(ev: BlogWebhookEvent) {
    const next = hook.events.includes(ev)
      ? hook.events.filter((e) => e !== ev)
      : [...hook.events, ev];
    if (next.length === 0) return; // a hook must fire on at least one event
    void run(() => updateBlogWebhook(hook.id, { events: next }));
  }

  return (
    <li className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {FORMAT_LABEL[hook.format] ?? hook.format}
            </span>
            {hook.name && (
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{hook.name}</span>
            )}
          </div>
          <p className="mt-1 truncate font-mono text-[12px] text-slate-500 dark:text-slate-400">{hook.url}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* enabled toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={hook.enabled}
            disabled={busy}
            onClick={() => void run(() => updateBlogWebhook(hook.id, { enabled: !hook.enabled }))}
            className={`focus-ring relative h-6 w-10 rounded-full transition-colors ${
              hook.enabled ? "bg-accent-600" : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                hook.enabled ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
          <button
            type="button"
            aria-label={t("delete")}
            disabled={busy}
            onClick={() => void run(() => deleteBlogWebhook(hook.id))}
            className="focus-ring rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* event toggles */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ALL_BLOG_WEBHOOK_EVENTS.map((ev) => {
          const on = hook.events.includes(ev);
          return (
            <button
              key={ev}
              type="button"
              disabled={busy}
              onClick={() => toggleEvent(ev)}
              aria-pressed={on}
              className={`focus-ring rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                on
                  ? "border-transparent bg-accent-600 text-white"
                  : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
              }`}
            >
              {t(`event.${ev}`)}
            </button>
          );
        })}
      </div>

      {hook.autoDisabledReason && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {t("autoDisabled")}
        </p>
      )}
      {hook.lastStatusCode != null && !hook.autoDisabledReason && (
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          {t("lastDelivery", { status: hook.lastStatusCode })}
        </p>
      )}
    </li>
  );
}

function CreateForm({ onCreated, disabled }: { onCreated: () => void; disabled: boolean }) {
  const t = useTranslations("blogWebhooks");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [events, setEvents] = useState<BlogWebhookEvent[]>([...ALL_BLOG_WEBHOOK_EVENTS]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggle(ev: BlogWebhookEvent) {
    setEvents((cur) => (cur.includes(ev) ? cur.filter((e) => e !== ev) : [...cur, ev]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !url.trim() || events.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const issued = await registerBlogWebhook({ url: url.trim(), name: name.trim() || null, events });
      setSecret(issued.secret);
      setUrl("");
      setName("");
      setEvents([...ALL_BLOG_WEBHOOK_EVENTS]);
      onCreated();
    } catch {
      setError(t("createError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("addTitle")}</h2>

      {secret && (
        <div className="mb-4 rounded-2xl border border-accent-200 bg-accent-50/60 p-4 dark:border-accent-500/30 dark:bg-accent-500/10">
          <p className="text-[13px] font-semibold text-accent-800 dark:text-accent-200">{t("secretTitle")}</p>
          <p className="mt-0.5 text-[12px] text-accent-700/80 dark:text-accent-300/80">{t("secretHint")}</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-[12px] text-slate-700 ring-1 ring-accent-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-accent-500/30">
              {secret}
            </code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(secret);
                setCopied(true);
              }}
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-accent-700"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={submit}
        className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
      >
        <div>
          <label htmlFor="webhook-url" className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
            {t("urlLabel")}
          </label>
          <input
            id="webhook-url"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/…"
            className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{t("urlHint")}</p>
        </div>
        <div>
          <label htmlFor="webhook-name" className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
            {t("nameLabel")}
          </label>
          <input
            id="webhook-name"
            type="text"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
            {t("eventsLabel")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {ALL_BLOG_WEBHOOK_EVENTS.map((ev) => {
              const on = events.includes(ev);
              return (
                <button
                  key={ev}
                  type="button"
                  onClick={() => toggle(ev)}
                  aria-pressed={on}
                  className={`focus-ring rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    on
                      ? "border-transparent bg-accent-600 text-white"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                  }`}
                >
                  {t(`event.${ev}`)}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>}
        {disabled && <p className="text-[12px] text-amber-600 dark:text-amber-400">{t("limitReached")}</p>}

        <button
          type="submit"
          disabled={busy || disabled || !url.trim() || events.length === 0}
          className="focus-ring inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Webhook className="h-4 w-4" />
          {t("addButton")}
        </button>
      </form>
    </section>
  );
}
