"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ApiError, isValidUrl, shortenUrl } from "@/lib/api";
import { getPowToken } from "@/lib/pow";
import { track } from "@/components/posthog-provider";
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

  const [campaign, setCampaign] = useState("");
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
      // exactly one short link, just from the original URL (plus optional standalone campaign tag).
      // Custom code only applies in single-link mode — bulk mode would otherwise collide on the
      // second variant.
      const variants = buildVariants(trimmed, campaign.trim(), channels);
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
          has_campaign: Boolean(campaign),
          channels: variants.length,
        });
        onShortened(ok);
        setUrl("");
        setCustomCode("");
        setExpiresAt("");
        setCampaign("");
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
            <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50/50 p-3">
            {authenticated && (
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block min-w-0 space-y-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
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
                <label className="block min-w-0 space-y-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
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
            )}

            <div className="space-y-2">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  {t("utmTitle")}
                </span>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">{t("utmHint")}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                  {t("utmExample")}
                </p>
              </div>
              <label className="block space-y-1">
                <span className="text-[11px] text-slate-500">{t("campaignLabel")}</span>
                <Input
                  type="text"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                  placeholder={t("campaignPlaceholder")}
                  className="h-9 text-sm"
                  disabled={busy}
                />
              </label>
              <div className="flex flex-wrap gap-1.5">
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
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition " +
                        (on
                          ? "border-accent-300 bg-accent-100 text-accent-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900")
                      }
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              {/* Inline result preview — once the user picks at least one channel, surface how
                  many short URLs will be generated so the "this is one input but it'll make
                  multiple links" mental model is explicit before they submit. Zero-state
                  (no channels picked) stays quiet — submit will produce exactly one URL. */}
              {channels.size > 0 && (
                <p
                  className="rounded-md bg-accent-50 px-2.5 py-1.5 text-[11px] font-medium text-accent-800"
                  data-testid="variants-preview"
                >
                  {channels.size === 1
                    ? t("variantsCount", { count: 1 })
                    : t("variantsCountPlural", { count: channels.size })}
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

function buildVariants(
  baseUrl: string,
  campaign: string,
  channels: Set<string>,
): { url: string; channel?: string }[] {
  if (channels.size === 0) {
    if (!campaign) return [{ url: baseUrl }];
    return [{ url: appendUtm(baseUrl, { campaign }) }];
  }
  return CHANNEL_PRESETS.filter((p) => channels.has(p.id)).map((p) => ({
    url: appendUtm(baseUrl, { source: p.source, medium: p.medium, campaign: campaign || undefined }),
    channel: p.label,
  }));
}

function appendUtm(
  raw: string,
  parts: { source?: string; medium?: string; campaign?: string },
): string {
  try {
    const u = new URL(raw);
    if (parts.source) u.searchParams.set("utm_source", parts.source);
    if (parts.medium) u.searchParams.set("utm_medium", parts.medium);
    if (parts.campaign) u.searchParams.set("utm_campaign", parts.campaign);
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
