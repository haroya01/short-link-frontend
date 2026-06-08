"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  deleteWebhook,
  listWebhooks,
  registerWebhook,
  toggleWebhook,
  updateWebhookConfig,
} from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import type { IssuedWebhook, WebhookConfigPatch, WebhookFormat, WebhookSummary } from "@/types";

/**
 * Per-link webhook management. Sits on the stats page so the owner can wire Slack/Discord/own
 * endpoints to receive a signed POST per click. The freshly-issued secret is shown ONCE in an
 * amber banner — same UX as the API keys section.
 */
export function LinkWebhooksSection({ shortCode }: { shortCode: string }) {
  const t = useTranslations("stats.webhooks");
  const errorMessage = useApiErrorMessage();
  const { toast } = useToast();
  const [items, setItems] = useState<WebhookSummary[] | null>(null);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<IssuedWebhook | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    listWebhooks(shortCode)
      .then((res) => {
        if (!cancelled) setItems(res);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [shortCode]);

  async function refresh() {
    try {
      const res = await listWebhooks(shortCode);
      setItems(res);
    } catch {
      // ignore — keep stale list rather than blank
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await registerWebhook(shortCode, url.trim(), name.trim() || undefined);
      setIssued(result);
      setRevealed(true);
      setUrl("");
      setName("");
      await refresh();
    } catch (err) {
      toast(errorMessage(err, t("registerFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(id: number, enabled: boolean) {
    try {
      await toggleWebhook(shortCode, id, enabled);
      await refresh();
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await deleteWebhook(shortCode, id);
      await refresh();
      toast(t("deleted"), "success");
    } catch (err) {
      toast(errorMessage(err, t("deleteFailed")), "error");
    }
  }

  async function handleSaveConfig(id: number, patch: WebhookConfigPatch) {
    try {
      await updateWebhookConfig(shortCode, id, patch);
      await refresh();
      toast(t("configSaved"), "success");
    } catch (err) {
      toast(errorMessage(err, t("configFailed")), "error");
    }
  }

  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copySecret() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.secret);
      toast(t("secretCopied"), "success");
    } catch {
      toast(t("copyFailed"), "error");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("title")}</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{t("description")}</p>
      </div>

      <form onSubmit={handleRegister} className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
          required
          disabled={busy}
        />
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          maxLength={100}
          disabled={busy}
        />
        <Button type="submit" size="sm" variant="accent" disabled={busy || !url.trim()}>
          {busy ? t("registering") : t("register")}
        </Button>
      </form>

      {issued && (
        <div className="mt-3 rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-900">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{t("issuedTitle")}</p>
            <FormatBadge format={issued.format} t={t} />
          </div>
          {issued.format === "DISCORD" ? (
            <p className="mt-1">{t("issuedFormatDiscord")}</p>
          ) : issued.format === "SLACK" ? (
            <p className="mt-1">{t("issuedFormatSlack")}</p>
          ) : (
            <p className="mt-1">{t("issuedHint")}</p>
          )}
          <div className="mt-2 flex gap-2">
            <code className="flex-1 break-all rounded bg-white dark:bg-slate-900 px-2 py-1.5 font-mono text-[11px] text-slate-900 dark:text-slate-100">
              {revealed ? issued.secret : "•".repeat(48)}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRevealed((v) => !v)}
            >
              {revealed ? t("hide") : t("reveal")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={copySecret}>
              {t("copy")}
            </Button>
          </div>
          <button
            type="button"
            className="mt-2 text-amber-700 dark:text-amber-400 underline hover:text-amber-900"
            onClick={() => setIssued(null)}
          >
            {t("dismiss")}
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {items === null ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">{t("loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("empty")}</p>
        ) : (
          items.map((hook) => (
            <div
              key={hook.id}
              className={
                "rounded-md border px-3 py-2 text-xs " +
                (hook.enabled ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50")
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  {hook.name && (
                    <span className="mr-2 font-medium text-slate-900 dark:text-slate-100">{hook.name}</span>
                  )}
                  <code
                    className="break-all font-mono text-[11px] text-slate-600 dark:text-slate-300"
                    title={hook.url}
                  >
                    {hook.url}
                  </code>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <StatusPill hook={hook} t={t} />
                    <FormatBadge format={hook.format} t={t} />
                    {!hook.includeBots && (
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                        {t("badgeSkipBots")}
                      </span>
                    )}
                    {hook.sampleRate < 100 && (
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                        {t("badgeSample", { rate: hook.sampleRate })}
                      </span>
                    )}
                    {hook.batchEnabled && (
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                        {t("badgeBatch")}
                      </span>
                    )}
                    {hook.dailyQuota != null && (
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                        {t("badgeQuota", { n: hook.dailyQuota })}
                      </span>
                    )}
                    {hook.lastCalledAt && (
                      <span>
                        {t("lastCalled")}: {hook.lastCalledAt.replace("T", " ").slice(0, 19)}
                      </span>
                    )}
                    {hook.consecutiveFailures > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        {t("consecutiveFailures", { n: hook.consecutiveFailures })}
                      </span>
                    )}
                    {hook.lastError && (
                      <span className="text-red-600 dark:text-red-400" title={hook.lastError}>
                        {hook.lastError.length > 50
                          ? hook.lastError.slice(0, 50) + "…"
                          : hook.lastError}
                      </span>
                    )}
                  </div>
                  {hook.autoDisabledReason && (
                    <p className="mt-1 rounded bg-red-50 dark:bg-red-500/10 px-2 py-1 text-[11px] text-red-700 dark:text-red-400">
                      {hook.autoDisabledReason}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleExpanded(hook.id)}
                  >
                    {expanded.has(hook.id) ? t("hideOptions") : t("options")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggle(hook.id, !hook.enabled)}
                  >
                    {hook.enabled ? t("disable") : t("enable")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-red-600 dark:text-red-400 hover:bg-red-50"
                    onClick={() => handleDelete(hook.id)}
                  >
                    {t("delete")}
                  </Button>
                </div>
              </div>
              {expanded.has(hook.id) && (
                <ConfigForm
                  hook={hook}
                  onSave={(patch) => handleSaveConfig(hook.id, patch)}
                />
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ConfigForm({
  hook,
  onSave,
}: {
  hook: WebhookSummary;
  onSave: (patch: WebhookConfigPatch) => void;
}) {
  const t = useTranslations("stats.webhooks");
  const [includeBots, setIncludeBots] = useState(hook.includeBots);
  const [sampleRate, setSampleRate] = useState(hook.sampleRate);
  const [batchEnabled, setBatchEnabled] = useState(hook.batchEnabled);
  const [dailyQuota, setDailyQuota] = useState(hook.dailyQuota?.toString() ?? "");
  const [referrerHostFilter, setReferrerHostFilter] = useState(hook.referrerHostFilter ?? "");
  const [utmSourceFilter, setUtmSourceFilter] = useState(hook.utmSourceFilter ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const quota = dailyQuota.trim() === "" ? null : Number(dailyQuota);
    onSave({
      includeBots,
      sampleRate,
      batchEnabled,
      dailyQuota: quota,
      referrerHostFilter,
      utmSourceFilter,
    });
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeBots}
            onChange={(e) => setIncludeBots(e.target.checked)}
          />
          <span className="text-xs text-slate-700 dark:text-slate-300">{t("optIncludeBots")}</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={batchEnabled}
            onChange={(e) => setBatchEnabled(e.target.checked)}
          />
          <span className="text-xs text-slate-700 dark:text-slate-300">{t("optBatch")}</span>
        </label>
      </div>
      <div>
        <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
          {t("optSampleRate", { rate: sampleRate })}
        </label>
        <input
          type="range"
          min={1}
          max={100}
          value={sampleRate}
          onChange={(e) => setSampleRate(Number(e.target.value))}
          className="mt-1 h-1 w-full cursor-pointer accent-slate-900"
          aria-label={t("optSampleRateAria")}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{t("optDailyQuota")}</label>
          <Input
            type="number"
            value={dailyQuota}
            onChange={(e) => setDailyQuota(e.target.value)}
            min={0}
            placeholder={t("optDailyQuotaPlaceholder")}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
            {t("optReferrerFilter")}
          </label>
          <Input
            type="text"
            value={referrerHostFilter}
            onChange={(e) => setReferrerHostFilter(e.target.value)}
            maxLength={255}
            placeholder="twitter.com"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{t("optUtmFilter")}</label>
          <Input
            type="text"
            value={utmSourceFilter}
            onChange={(e) => setUtmSourceFilter(e.target.value)}
            maxLength={100}
            placeholder="instagram"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" variant="accent">
          {t("save")}
        </Button>
      </div>
    </form>
  );
}

function FormatBadge({
  format,
  t,
}: {
  format: WebhookFormat;
  t: (k: string) => string;
}) {
  // Stay within the slate scale — the brand reserves color for the accent green. Detected
  // managed receivers (Discord/Slack) get a slightly darker slate to read as "this is special",
  // generic stays the neutral light slate.
  if (format === "DISCORD" || format === "SLACK") {
    return (
      <span className="rounded bg-slate-900 dark:bg-white px-1.5 py-0.5 text-[10px] font-medium text-white dark:text-slate-900">
        {format === "DISCORD" ? t("formatBadgeDiscord") : t("formatBadgeSlack")}
      </span>
    );
  }
  return (
    <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
      {t("formatBadgeGeneric")}
    </span>
  );
}

function StatusPill({
  hook,
  t,
}: {
  hook: WebhookSummary;
  t: (k: string) => string;
}) {
  if (!hook.enabled) {
    return (
      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700 dark:text-slate-300">
        {t("disabled")}
      </span>
    );
  }
  if (hook.lastStatusCode == null) {
    return (
      <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
        {t("idle")}
      </span>
    );
  }
  const ok = hook.lastStatusCode >= 200 && hook.lastStatusCode < 300;
  return (
    <span
      className={
        "rounded px-1.5 py-0.5 text-[10px] font-medium " +
        (ok ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400")
      }
    >
      {hook.lastStatusCode}
    </span>
  );
}
