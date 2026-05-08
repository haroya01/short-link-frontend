"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/toast";
import {
  deleteWebhook,
  listWebhooks,
  registerWebhook,
  toggleWebhook,
} from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import type { IssuedWebhook, WebhookSummary } from "@/types";

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
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900">{t("title")}</h2>
        <p className="mt-1 text-xs text-slate-500">{t("description")}</p>
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
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-medium">{t("issuedTitle")}</p>
          <p className="mt-1">{t("issuedHint")}</p>
          <div className="mt-2 flex gap-2">
            <code className="flex-1 break-all rounded bg-white px-2 py-1.5 font-mono text-[11px] text-slate-900">
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
            className="mt-2 text-amber-700 underline hover:text-amber-900"
            onClick={() => setIssued(null)}
          >
            {t("dismiss")}
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {items === null ? (
          <p className="text-xs text-slate-400">{t("loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-500">{t("empty")}</p>
        ) : (
          items.map((hook) => (
            <div
              key={hook.id}
              className={
                "flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs " +
                (hook.enabled ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50")
              }
            >
              <div className="min-w-0 flex-1">
                {hook.name && (
                  <span className="mr-2 font-medium text-slate-900">{hook.name}</span>
                )}
                <code
                  className="break-all font-mono text-[11px] text-slate-600"
                  title={hook.url}
                >
                  {hook.url}
                </code>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <StatusPill hook={hook} t={t} />
                  {hook.lastCalledAt && (
                    <span>
                      {t("lastCalled")}: {hook.lastCalledAt.replace("T", " ").slice(0, 19)}
                    </span>
                  )}
                  {hook.lastError && (
                    <span className="text-red-600" title={hook.lastError}>
                      {hook.lastError.length > 50
                        ? hook.lastError.slice(0, 50) + "…"
                        : hook.lastError}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
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
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(hook.id)}
                >
                  {t("delete")}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
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
      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700">
        {t("disabled")}
      </span>
    );
  }
  if (hook.lastStatusCode == null) {
    return (
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
        {t("idle")}
      </span>
    );
  }
  const ok = hook.lastStatusCode >= 200 && hook.lastStatusCode < 300;
  return (
    <span
      className={
        "rounded px-1.5 py-0.5 text-[10px] font-medium " +
        (ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")
      }
    >
      {hook.lastStatusCode}
    </span>
  );
}
