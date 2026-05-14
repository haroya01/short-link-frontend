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
        <Button type="submit" size="lg" variant="accent" disabled={busy} className="sm:w-auto sm:min-w-32">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
        </Button>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          />
          {t("advancedToggle")}
        </button>
        {showAdvanced && (
          <div className="mt-2 space-y-3 rounded-md border border-slate-200 bg-slate-50/50 p-3">
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
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  {t("utmTitle")}
                </span>
                <span className="text-[10px] text-slate-400">{t("utmHint")}</span>
              </div>
              <Input
                type="text"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder={t("campaignPlaceholder")}
                className="h-9 text-sm"
                disabled={busy}
              />
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
            </div>
          </div>
        )}
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
