"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import {
  deleteCustomDomain,
  listCustomDomains,
  registerCustomDomain,
  verifyCustomDomain,
} from "@/lib/api";
import type { CustomDomain } from "@/types";

/**
 * User-owned custom domains. Workflow shown to the user:
 * 1. Register a domain — backend issues a verification token.
 * 2. Add the token as a TXT record at {@code _kurl-verify.<domain>}.
 * 3. Click verify — backend resolves the TXT record and flips status to verified.
 * 4. Set a CNAME from {@code <domain>} to {@code kurl.me} (or front it with Cloudflare).
 *
 * Verified domains accept short-URL traffic via Host-header routing on the backend.
 */
export function CustomDomainsSection() {
  const t = useTranslations("settings.customDomains");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [items, setItems] = useState<CustomDomain[] | null>(null);
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    try {
      setItems(await listCustomDomains());
    } catch {
      setItems([]);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await registerCustomDomain(domain.trim());
      setDomain("");
      await refresh();
    } catch (err) {
      toast(errorMessage(err, t("registerFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(id: number) {
    try {
      await verifyCustomDomain(id);
      await refresh();
      toast(t("verified"), "success");
    } catch (err) {
      toast(errorMessage(err, t("verifyFailed")), "error");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await deleteCustomDomain(id);
      await refresh();
      toast(t("deleted"), "success");
    } catch (err) {
      toast(errorMessage(err, t("deleteFailed")), "error");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">{t("description")}</p>

      <form onSubmit={handleRegister} className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="go.example.com"
          disabled={busy}
          required
        />
        <Button type="submit" size="sm" variant="accent" disabled={busy || !domain.trim()}>
          {busy ? t("registering") : t("register")}
        </Button>
      </form>

      <div className="space-y-2">
        {items === null ? (
          <p className="text-xs text-slate-400">{t("loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-500">{t("empty")}</p>
        ) : (
          items.map((d) => <DomainRow key={d.id} d={d} onVerify={handleVerify} onDelete={handleDelete} t={t} />)
        )}
      </div>
    </div>
  );
}

function DomainRow({
  d,
  onVerify,
  onDelete,
  t,
}: {
  d: CustomDomain;
  onVerify: (id: number) => void;
  onDelete: (id: number) => void;
  t: ReturnType<typeof useTranslations<"settings.customDomains">>;
}) {
  const [revealed, setRevealed] = useState(!d.verified);
  return (
    <div
      className={
        "rounded-md border px-3 py-2 text-xs " +
        (d.verified ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/40")
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-sm font-semibold text-slate-900">{d.domain}</code>
        {d.verified ? (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
            {t("statusVerified")}
          </span>
        ) : (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            {t("statusPending")}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {!d.verified && (
            <Button type="button" size="sm" variant="accent" onClick={() => onVerify(d.id)}>
              {t("verify")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-600 hover:bg-red-50"
            onClick={() => onDelete(d.id)}
          >
            {t("delete")}
          </Button>
        </div>
      </div>

      {revealed && (
        <div className="mt-2 space-y-1.5 text-[11px]">
          <p className="text-slate-600">{t("step1")}</p>
          <div className="grid grid-cols-1 gap-1 rounded bg-white px-2 py-1.5 font-mono sm:grid-cols-[80px_1fr]">
            <span className="text-slate-500">Type</span>
            <span className="text-slate-900">TXT</span>
            <span className="text-slate-500">Host</span>
            <span className="text-slate-900 break-all">{d.verificationHost}</span>
            <span className="text-slate-500">Value</span>
            <span className="break-all text-slate-900">{d.verificationToken}</span>
          </div>
          <p className="text-slate-600">{t("step2")}</p>
          <div className="grid grid-cols-1 gap-1 rounded bg-white px-2 py-1.5 font-mono sm:grid-cols-[80px_1fr]">
            <span className="text-slate-500">Type</span>
            <span className="text-slate-900">CNAME</span>
            <span className="text-slate-500">Host</span>
            <span className="text-slate-900 break-all">{d.domain}</span>
            <span className="text-slate-500">Value</span>
            <span className="text-slate-900">kurl.me</span>
          </div>
          <button
            type="button"
            className="text-[10px] text-slate-500 underline hover:text-slate-700"
            onClick={() => setRevealed(false)}
          >
            {t("hideInstructions")}
          </button>
        </div>
      )}
      {!revealed && (
        <button
          type="button"
          className="mt-1 text-[10px] text-slate-500 underline hover:text-slate-700"
          onClick={() => setRevealed(true)}
        >
          {t("showInstructions")}
        </button>
      )}
    </div>
  );
}
