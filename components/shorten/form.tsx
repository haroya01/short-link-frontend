"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, isValidUrl, shortenUrl } from "@/lib/api";
import { getPowToken } from "@/lib/pow";
import { track } from "@/components/common/posthog-provider";
import type { CreateLinkResponse } from "@/types";

type ShortenedItem = {
  res: CreateLinkResponse;
  originalUrl: string;
  channel?: string;
};

type Props = {
  authenticated: boolean;
  onShortened: (results: ShortenedItem[]) => void;
};

const CHANNEL_PRESETS: { id: string; label: string; source: string; medium: string }[] = [
  { id: "instagram", label: "Instagram", source: "instagram", medium: "bio" },
  { id: "kakao", label: "KakaoTalk", source: "kakao", medium: "profile" },
  { id: "x", label: "X", source: "x", medium: "post" },
  { id: "blog", label: "Blog", source: "blog", medium: "article" },
  { id: "email", label: "Email", source: "email", medium: "newsletter" },
  { id: "qr", label: "QR", source: "qr", medium: "offline" },
];

export function ShortenForm({ authenticated, onShortened }: Props) {
  const t = useTranslations("shortenForm");
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [channels, setChannels] = useState<Set<string>>(new Set());

  // Pre-warm proof-of-work for anonymous users so submit doesn't pay the mining cost. Authenticated
  // users skip PoW server-side, so don't bother computing.
  useEffect(() => {
    if (!authenticated) {
      getPowToken().catch(() => {});
    }
  }, [authenticated]);

  function toggleChannel(id: string) {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = url.trim();
    if (!trimmed) {
      setError(t("errors.empty"));
      return;
    }
    if (!isValidUrl(trimmed)) {
      setError(t("errors.invalid"));
      return;
    }

    setBusy(true);
    try {
      // Resolve which channels we're going to materialize. With nothing checked we still produce
      // exactly one short link, just from the original URL. Custom code only applies in single-link
      // mode — bulk mode would otherwise collide on the second variant.
      const variants = buildVariants(trimmed, channels);
      const isBatch = variants.length > 1;
      const codeForSingle =
        !isBatch && authenticated && customCode.trim() ? customCode.trim() : undefined;
      const expiry =
        authenticated && expiresAt ? new Date(expiresAt).toISOString() : undefined;

      type Settled =
        | { kind: "ok"; item: ShortenedItem }
        | { kind: "err"; err: unknown };
      const settled: Settled[] = await Promise.all(
        variants.map((v) =>
          shortenUrl({
            url: v.url,
            customCode: variants.length === 1 ? codeForSingle : undefined,
            expiresAt: expiry,
          })
            .then(
              (res): Settled => ({
                kind: "ok",
                item: { res, originalUrl: v.url, channel: v.channel },
              }),
            )
            .catch((err): Settled => ({ kind: "err", err })),
        ),
      );

      const ok = settled.flatMap((s) => (s.kind === "ok" ? [s.item] : []));
      const firstErr = settled.find((s) => s.kind === "err");

      if (ok.length > 0) {
        track("link_shortened", {
          count: ok.length,
          authenticated,
          has_custom_code: Boolean(codeForSingle),
          has_expiry: Boolean(expiry),
          channels: variants.length,
        });
        onShortened(ok);
        setUrl("");
        setCustomCode("");
        setExpiresAt("");
        setChannels(new Set());
      }
      if (firstErr && firstErr.kind === "err") {
        setError(messageOf(firstErr.err, t));
      }
    } catch (err) {
      setError(messageOf(err, t));
    } finally {
      setBusy(false);
    }
  }

  const submitLabel =
    channels.size > 1 ? t("submitBatch", { count: channels.size }) : t("submit");

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("placeholder")}
          disabled={busy}
          aria-invalid={!!error}
          className="h-12 sm:flex-1"
        />
        <Button
          type="submit"
          size="lg"
          variant="accent"
          disabled={busy}
          className="h-12 w-full sm:h-11 sm:w-auto sm:min-w-32"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
        </Button>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
          aria-controls="shorten-advanced-section"
          className="inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-900"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${showAdvanced ? "rotate-180" : ""}`}
          />
          {t("advancedToggle")}
        </button>
        {/*
         * Grid-rows trick for "auto height" reveal animations: an outer grid container animates
         * between `grid-rows-[0fr]` (collapsed) and `grid-rows-[1fr]` (expanded), and the inner
         * panel uses `min-h-0 overflow-hidden` so its measured content is clipped during transit.
         * Trade-offs we considered:
         *   - `max-height: 9999px` — janky easing curve because the browser interpolates against the
         *     impossible upper bound, not the real content height.
         *   - JS-measured `max-height` — needs ResizeObserver + a reflow on every layout-changing
         *     field, fragile when authenticated/anonymous variants swap the row count.
         *   - `display: none` / `display: block` toggle — instant, breaks the animation entirely.
         * The grid-rows variant is one declarative CSS rule and survives every variant of the
         * inner content (auth row appears / channel pills wrap onto a new line) without any
         * JS bookkeeping. Reduce-motion users skip the animation entirely via a media query
         * collapse inside the same className.
         */}
        <div
          id="shorten-advanced-section"
          aria-hidden={!showAdvanced}
          className={`grid transition-[grid-template-rows,opacity] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${
            showAdvanced
              ? "mt-2 grid-rows-[1fr] opacity-100"
              : "mt-0 grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            {/* Advanced section follows the result card's tone — no tinted panel, no boxed sub-
                sections, just spacing + a single hairline between the "this link" config (custom
                code, expiry) and the "this campaign" config (channels, group name). Earlier
                revision had a `bg-slate-50/50` panel that made advanced feel like a separate UI
                surface; minimal-pass merged it into the form's own white background. */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            {authenticated && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block min-w-0 space-y-1.5">
                    <span className="text-[12px] font-medium text-slate-700">
                      {t("customCodeLabel")}
                    </span>
                    <Input
                      type="text"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      pattern="^[0-9A-Za-z]{3,16}$"
                      placeholder={t("customCodePlaceholder")}
                      className="h-9 font-mono text-sm"
                      disabled={busy || channels.size > 0}
                    />
                  </label>
                  <label className="block min-w-0 space-y-1.5">
                    <span className="text-[12px] font-medium text-slate-700">
                      {t("expiresAtLabel")}
                    </span>
                    <Input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="h-9 text-sm"
                      disabled={busy}
                    />
                  </label>
                </div>
                <div className="h-px bg-slate-100" aria-hidden />
              </>
            )}

            {/* Channels block — title + one-line subtitle frame the *outcome* (separate URLs per
                channel) instead of the mechanism ("UTM tracking"). The variants preview below the
                chips reinforces the outcome with the actual channel names once a chip is picked.
                Campaign-name input is intentionally absent from this surface — it was confusing
                first-time users for marginal value; power users who want to group across links
                set utm_campaign downstream in /campaigns or via the dashboard. */}
            <div className="space-y-2">
              <div className="space-y-0.5">
                <p className="text-[13px] font-medium text-slate-900">{t("utmTitle")}</p>
                <p className="text-[12px] text-slate-500">{t("utmSubtitle")}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CHANNEL_PRESETS.map((p) => {
                  const on = channels.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleChannel(p.id)}
                      disabled={busy}
                      title={`utm_source=${p.source} · utm_medium=${p.medium}`}
                      className={
                        "rounded-full border px-2.5 py-1 text-[12px] font-medium transition " +
                        (on
                          ? "border-accent-500 bg-accent-50 text-accent-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900")
                      }
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              {channels.size > 0 && (
                <p className="pt-0.5 text-[12px] text-slate-500" data-testid="variants-preview">
                  {channels.size === 1
                    ? t("variantsSummarySingle", { labels: selectedLabels(channels) })
                    : t("variantsSummary", {
                        count: channels.size,
                        labels: selectedLabels(channels),
                      })}
                </p>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

    </form>
  );
}

function selectedLabels(channels: Set<string>): string {
  return CHANNEL_PRESETS.filter((p) => channels.has(p.id))
    .map((p) => p.label)
    .join(", ");
}

function buildVariants(
  baseUrl: string,
  channels: Set<string>,
): { url: string; channel?: string }[] {
  if (channels.size === 0) return [{ url: baseUrl }];
  return CHANNEL_PRESETS.filter((p) => channels.has(p.id)).map((p) => ({
    url: appendUtm(baseUrl, { source: p.source, medium: p.medium }),
    channel: p.label,
  }));
}

function appendUtm(raw: string, parts: { source: string; medium: string }): string {
  try {
    const u = new URL(raw);
    u.searchParams.set("utm_source", parts.source);
    u.searchParams.set("utm_medium", parts.medium);
    return u.toString();
  } catch {
    return raw;
  }
}

function messageOf(err: unknown, t: (key: string) => string): string {
  if (err instanceof ApiError) {
    if (err.detail.code === "MALICIOUS_URL") return t("errors.malicious");
    if (err.detail.code === "DUPLICATE_SHORT_CODE") return t("errors.duplicate");
    if (err.detail.code === "VALIDATION_FAILED") {
      const fields = err.detail.errors?.map((e) => translateValidation(e.field, e.message, t));
      return fields?.join(", ") ?? t("errors.validation");
    }
    return err.detail.detail ?? t("errors.generic");
  }
  if (err instanceof Error) return err.message;
  return t("errors.generic");
}

function translateValidation(field: string, message: string, t: (key: string) => string): string {
  if (field === "customCode") return t("errors.customCodeFormat");
  if (field === "url") {
    if (message.toLowerCase().includes("http")) return t("errors.urlScheme");
    if (message.toLowerCase().includes("blank")) return t("errors.urlBlank");
    return t("errors.urlGeneric");
  }
  return message;
}
