"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError, issueApiKey, listApiKeys, revokeApiKey } from "@/lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/toast";
import type { ApiKeySummary, IssuedApiKey } from "@/types";

export function ApiKeysSection() {
  const t = useTranslations("settings.apiKeys");
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeySummary[] | null>(null);
  const [name, setName] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [issued, setIssued] = useState<IssuedApiKey | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listApiKeys()
      .then((items) => {
        if (!cancelled) setKeys(items);
      })
      .catch(() => {
        if (!cancelled) setKeys([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    try {
      const items = await listApiKeys();
      setKeys(items);
    } catch {
      // soft fail; the section just shows stale data
    }
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    setIssuing(true);
    try {
      const result = await issueApiKey(name);
      setIssued(result);
      setRevealed(true);
      setCopied(false);
      setName("");
      await refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t("issueFailed"), "error");
    } finally {
      setIssuing(false);
    }
  }

  async function handleRevoke(id: number) {
    if (!confirm(t("revokeConfirm"))) return;
    setRevoking(id);
    try {
      await revokeApiKey(id);
      await refresh();
      toast(t("revoked"), "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t("revokeFailed"), "error");
    } finally {
      setRevoking(null);
    }
  }

  async function handleCopy() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast(t("copyFailed"), "error");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">{t("description")}</p>

      <form onSubmit={handleIssue} className="flex gap-2">
        <Input
          type="text"
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          disabled={issuing}
          className="flex-1"
        />
        <Button type="submit" size="sm" variant="accent" disabled={issuing}>
          {issuing ? t("issuing") : t("issue")}
        </Button>
      </form>

      {issued && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-medium">{t("justIssuedTitle")}</p>
          <p className="mt-1">{t("justIssuedHint")}</p>
          <div className="mt-2 flex gap-2">
            <code className="flex-1 break-all rounded bg-white px-2 py-1.5 font-mono text-[11px] text-slate-900">
              {revealed ? issued.rawKey : "•".repeat(issued.rawKey.length)}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRevealed((v) => !v)}
            >
              {revealed ? t("hide") : t("reveal")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
              {copied ? t("copied") : t("copy")}
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

      {keys === null ? (
        <p className="text-xs text-slate-400">{t("loading")}</p>
      ) : keys.length === 0 ? (
        <p className="text-xs text-slate-500">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {keys.map((key) => {
            const isActive = key.revokedAt === null;
            return (
              <li
                key={key.id}
                className={
                  "flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs " +
                  (isActive ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 text-slate-500")
                }
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-[11px] text-slate-700">{key.prefix}…</code>
                    {key.name && (
                      <span className="font-medium text-slate-900">{key.name}</span>
                    )}
                    {!isActive && (
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700">
                        {t("revokedLabel")}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {t("createdAt")}: {key.createdAt.slice(0, 10)} ·{" "}
                    {t("lastUsedAt")}: {key.lastUsedAt ? key.lastUsedAt.slice(0, 10) : t("never")}
                  </div>
                </div>
                {isActive && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevoke(key.id)}
                    disabled={revoking === key.id}
                  >
                    {revoking === key.id ? t("revoking") : t("revoke")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
