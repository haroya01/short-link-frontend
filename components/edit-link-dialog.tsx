"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/toast";
import { ApiError, isValidUrl, updateLink } from "@/lib/api";
import type { MyLink } from "@/types";

type Props = {
  link: MyLink | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EditLinkDialog({ link, onClose, onSaved }: Props) {
  const t = useTranslations("edit");
  const [originalUrl, setOriginalUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (link) {
      setOriginalUrl(link.originalUrl);
      setExpiresAt(link.expiresAt ? toLocalInput(link.expiresAt) : "");
      setError(null);
    }
  }, [link]);

  useEffect(() => {
    if (!link) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [link, busy, onClose]);

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
      const urlChanged = originalUrl.trim() && originalUrl.trim() !== link.originalUrl;
      const beforeIso = link.expiresAt ?? null;
      const afterIso = expiresAt ? new Date(expiresAt).toISOString() : null;
      const expiresChanged = beforeIso !== afterIso;
      if (!urlChanged && !expiresChanged) {
        onClose();
        return;
      }
      await updateLink(link.shortCode, {
        originalUrl: urlChanged ? originalUrl.trim() : undefined,
        expiresAt: expiresChanged ? afterIso : undefined,
      });
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

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="accent" disabled={busy}>
            {busy ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
