"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/toast";
import {
  ApiError,
  getLinkDetail,
  isValidUrl,
  setLinkOgOverride,
  setLinkProtection,
  updateLink,
} from "@/lib/api";
import type { LinkDetail, MyLink } from "@/types";

type Props = {
  link: MyLink | null;
  onClose: () => void;
  onSaved: () => void;
};

type Section = "basic" | "og" | "protection";

export function EditLinkDialog({ link, onClose, onSaved }: Props) {
  const t = useTranslations("edit");
  const [section, setSection] = useState<Section>("basic");
  const [originalUrl, setOriginalUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [password, setPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [maxViewsInput, setMaxViewsInput] = useState("");
  const [detail, setDetail] = useState<LinkDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!link) return;
    setSection("basic");
    setOriginalUrl(link.originalUrl);
    setExpiresAt(link.expiresAt ? toLocalInput(link.expiresAt) : "");
    setOgTitle("");
    setOgDescription("");
    setOgImage("");
    setPassword("");
    setRemovePassword(false);
    setMaxViewsInput("");
    setDetail(null);
    setError(null);
    let cancelled = false;
    setLoadingDetail(true);
    getLinkDetail(link.shortCode)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setOgTitle(d.ogTitleOverride ?? "");
        setOgDescription(d.ogDescriptionOverride ?? "");
        setOgImage(d.ogImageOverride ?? "");
        setMaxViewsInput(d.maxViews != null ? String(d.maxViews) : "");
      })
      .catch(() => {
        if (cancelled) return;
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [link]);

  useEffect(() => {
    if (!link) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [link, busy, onClose]);

  const ogPlaceholders = useMemo(
    () => ({
      title: detail?.ogTitle ?? "",
      description: detail?.ogDescription ?? "",
      image: detail?.ogImage ?? "",
    }),
    [detail],
  );

  if (!link) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!link) return;
    if (originalUrl.trim() && !isValidUrl(originalUrl.trim())) {
      setError(t("invalidUrl"));
      return;
    }
    setBusy(true);
    try {
      await applyBasic();
      await applyOgOverride();
      await applyProtection();
      toast(t("saved"), "success");
      onSaved();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.detail.code === "MALICIOUS_URL"
            ? t("maliciousUrl")
            : (err.detail.detail ?? err.message)
          : err instanceof Error
            ? err.message
            : t("saveFailed");
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function applyBasic() {
    if (!link) return;
    const trimmed = originalUrl.trim();
    const urlChanged = trimmed.length > 0 && trimmed !== link.originalUrl;
    const beforeIso = link.expiresAt ?? null;
    const afterIso = expiresAt ? new Date(expiresAt).toISOString() : null;
    const expiresChanged = beforeIso !== afterIso;
    if (!urlChanged && !expiresChanged) return;
    await updateLink(link.shortCode, {
      originalUrl: urlChanged ? trimmed : undefined,
      expiresAt: expiresChanged ? afterIso : undefined,
    });
  }

  async function applyOgOverride() {
    if (!link || !detail) return;
    const next = {
      ogTitle: blankToNull(ogTitle),
      ogDescription: blankToNull(ogDescription),
      ogImage: blankToNull(ogImage),
    };
    const prev = {
      ogTitle: detail.ogTitleOverride,
      ogDescription: detail.ogDescriptionOverride,
      ogImage: detail.ogImageOverride,
    };
    if (
      next.ogTitle === prev.ogTitle &&
      next.ogDescription === prev.ogDescription &&
      next.ogImage === prev.ogImage
    ) {
      return;
    }
    await setLinkOgOverride(link.shortCode, next);
  }

  async function applyProtection() {
    if (!link || !detail) return;
    const trimmedMax = maxViewsInput.trim();
    let nextMaxViews: number | null;
    if (!trimmedMax) {
      nextMaxViews = null;
    } else {
      const parsed = Number(trimmedMax);
      if (!Number.isFinite(parsed) || parsed < 1 || !Number.isInteger(parsed)) {
        throw new Error(t("protection.maxViewsInvalid"));
      }
      nextMaxViews = parsed;
    }
    const passwordChanged = password.length > 0 || removePassword;
    const maxViewsChanged = nextMaxViews !== detail.maxViews;
    if (!passwordChanged && !maxViewsChanged) return;
    const passwordPayload = removePassword ? "" : password.length > 0 ? password : null;
    await setLinkProtection(link.shortCode, {
      password: passwordPayload,
      maxViews: nextMaxViews,
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => !busy && onClose()} />
      <form
        onSubmit={handleSave}
        className="relative w-full max-w-md animate-fade-in rounded-lg border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-slate-900">{t("title")}</h2>
          <span className="font-mono text-xs text-slate-500">/{link.shortCode}</span>
        </div>

        <div className="mb-4 flex gap-1 rounded-md bg-slate-100 p-1 text-xs">
          <TabButton active={section === "basic"} onClick={() => setSection("basic")}>
            {t("tabs.basic")}
          </TabButton>
          <TabButton active={section === "og"} onClick={() => setSection("og")}>
            {t("tabs.og")}
          </TabButton>
          <TabButton active={section === "protection"} onClick={() => setSection("protection")}>
            {t("tabs.protection")}
          </TabButton>
        </div>

        {section === "basic" && (
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {t("originalUrl")}
              </span>
              <Input
                type="url"
                inputMode="url"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                placeholder="https://..."
                disabled={busy}
                autoFocus
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {t("expiresAt")}
              </span>
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  disabled={busy}
                  className="flex-1"
                />
                {expiresAt && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpiresAt("")}
                    disabled={busy}
                  >
                    {t("clear")}
                  </Button>
                )}
              </div>
            </label>
          </div>
        )}

        {section === "og" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">{t("og.description")}</p>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {t("og.titleLabel")}
              </span>
              <Input
                type="text"
                value={ogTitle}
                onChange={(e) => setOgTitle(e.target.value)}
                placeholder={ogPlaceholders.title || t("og.titlePlaceholder")}
                maxLength={300}
                disabled={busy || loadingDetail}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {t("og.descriptionLabel")}
              </span>
              <textarea
                value={ogDescription}
                onChange={(e) => setOgDescription(e.target.value)}
                placeholder={ogPlaceholders.description || t("og.descriptionPlaceholder")}
                maxLength={800}
                disabled={busy || loadingDetail}
                rows={3}
                className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {t("og.imageLabel")}
              </span>
              <Input
                type="url"
                value={ogImage}
                onChange={(e) => setOgImage(e.target.value)}
                placeholder={ogPlaceholders.image || "https://..."}
                maxLength={1024}
                disabled={busy || loadingDetail}
              />
            </label>
          </div>
        )}

        {section === "protection" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">{t("protection.description")}</p>
            <div className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {t("protection.passwordLabel")}
              </span>
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (e.target.value) setRemovePassword(false);
                }}
                placeholder={
                  detail?.passwordProtected
                    ? t("protection.passwordSetHint")
                    : t("protection.passwordPlaceholder")
                }
                maxLength={200}
                disabled={busy || loadingDetail || removePassword}
                autoComplete="new-password"
              />
              {detail?.passwordProtected && (
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={removePassword}
                    onChange={(e) => {
                      setRemovePassword(e.target.checked);
                      if (e.target.checked) setPassword("");
                    }}
                    disabled={busy || loadingDetail}
                  />
                  {t("protection.removePassword")}
                </label>
              )}
            </div>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {t("protection.maxViewsLabel")}
              </span>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={maxViewsInput}
                onChange={(e) => setMaxViewsInput(e.target.value)}
                placeholder={t("protection.maxViewsPlaceholder")}
                disabled={busy || loadingDetail}
              />
              {detail && detail.maxViews != null && (
                <p className="text-xs text-slate-500">
                  {t("protection.viewCountHint", {
                    current: detail.viewCount,
                    max: detail.maxViews,
                  })}
                </p>
              )}
            </label>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="accent" disabled={busy || loadingDetail}>
            {busy ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex-1 rounded px-2 py-1.5 text-center transition " +
        (active
          ? "bg-white font-medium text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-900")
      }
    >
      {children}
    </button>
  );
}

function blankToNull(s: string): string | null {
  const trimmed = s.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
