"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Trash2 } from "lucide-react";
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

  // While any pending domain is still inside its auto-verify window, poll the list every 10s so
  // the row flips to verified without a manual refresh. Stops once nothing is pending in-window.
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const now = Date.now();
    const hasActive =
      items?.some(
        (d) => !d.verified && d.autoVerifyUntil && new Date(d.autoVerifyUntil).getTime() > now,
      ) ?? false;
    if (hasActive && pollerRef.current === null) {
      pollerRef.current = setInterval(refresh, 10_000);
    } else if (!hasActive && pollerRef.current !== null) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
    return () => {
      if (pollerRef.current !== null) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
  }, [items]);

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
    <div className="space-y-3">
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

      {items === null ? (
        <p className="text-xs text-slate-400">{t("loading")}</p>
      ) : items.length === 0 ? null : (
        <ul className="space-y-2">
          {items.map((d) => (
            <li key={d.id}>
              <DomainRow d={d} onVerify={handleVerify} onDelete={handleDelete} t={t} />
            </li>
          ))}
        </ul>
      )}
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
  const [now, setNow] = useState(() => Date.now());
  const inAutoWindow =
    !d.verified && d.autoVerifyUntil != null && new Date(d.autoVerifyUntil).getTime() > now;

  useEffect(() => {
    if (!inAutoWindow) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [inAutoWindow]);

  const remainingMs = d.autoVerifyUntil ? new Date(d.autoVerifyUntil).getTime() - now : 0;

  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <code className="truncate font-mono text-sm font-medium text-slate-900">{d.domain}</code>
          <StatusPill verified={d.verified} inAutoWindow={inAutoWindow} remainingMs={remainingMs} t={t} />
        </div>
        <div className="flex items-center gap-1">
          {!d.verified && !inAutoWindow && (
            <Button type="button" size="sm" variant="outline" onClick={() => onVerify(d.id)}>
              {t("verifyNow")}
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("delete")}
            className="text-slate-400 hover:text-red-600"
            onClick={() => onDelete(d.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!d.verified && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 px-3 py-3">
          <DnsRecord
            type="TXT"
            host={d.verificationHost}
            value={d.verificationToken}
            hint={t("dnsTxtHint")}
          />
          <DnsRecord type="CNAME" host={d.domain} value="kurl.me" hint={t("dnsCnameHint")} />
        </div>
      )}
    </div>
  );
}

function StatusPill({
  verified,
  inAutoWindow,
  remainingMs,
  t,
}: {
  verified: boolean;
  inAutoWindow: boolean;
  remainingMs: number;
  t: ReturnType<typeof useTranslations<"settings.customDomains">>;
}) {
  if (verified) {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
        {t("statusVerified")}
      </span>
    );
  }
  if (inAutoWindow) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        {t("statusAutoChecking", { time: formatRemaining(remainingMs) })}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
      {t("statusPending")}
    </span>
  );
}

function DnsRecord({
  type,
  host,
  value,
  hint,
}: {
  type: "TXT" | "CNAME";
  host: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-slate-500">{hint}</p>
      <div className="flex items-stretch overflow-hidden rounded border border-slate-200 bg-white font-mono text-[11px]">
        <span className="flex items-center bg-slate-100 px-2 text-slate-500">{type}</span>
        <CopyCell label={host} className="flex-1 border-l border-slate-200" />
        <CopyCell label={value} className="flex-1 border-l border-slate-200" />
      </div>
    </div>
  );
}

function CopyCell({ label, className = "" }: { label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(label);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable — silently no-op */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className={
        "group flex items-center justify-between gap-2 px-2 py-1.5 text-left text-slate-800 hover:bg-slate-50 " +
        className
      }
    >
      <span className="truncate">{label}</span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-emerald-600" />
      ) : (
        <Copy className="h-3 w-3 shrink-0 text-slate-300 transition group-hover:text-slate-500" />
      )}
    </button>
  );
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
