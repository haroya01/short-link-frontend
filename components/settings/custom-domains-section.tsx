"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useConfirm } from "@/components/ui/use-confirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import {
  deleteCustomDomain,
  listCustomDomains,
  registerCustomDomain,
  verifyCustomDomain,
} from "@/lib/api";
import { GroupedList } from "@/components/common/grouped-list";
import { ErrorRow, NoteRow } from "@/components/settings/settings-rows";
import type { CustomDomain } from "@/types";

export function CustomDomainsSection() {
  const t = useTranslations("settings.customDomains");
  const [confirm, confirmDialog] = useConfirm();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [items, setItems] = useState<CustomDomain[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const loadedRef = useRef(false);
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
      loadedRef.current = true;
      setLoadFailed(false);
    } catch {
      // Keep the existing list on a transient failure so a single failed poll doesn't wipe the
      // rows and stop the auto-verify poller.
      if (!loadedRef.current) setLoadFailed(true);
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
    if (!(await confirm({ title: t("deleteConfirm"), destructive: true }))) return;
    try {
      await deleteCustomDomain(id);
      await refresh();
      toast(t("deleted"), "success");
    } catch (err) {
      toast(errorMessage(err, t("deleteFailed")), "error");
    }
  }

  return (
    <>
      <GroupedList title={t("title")} footer={t("description")}>
        <form onSubmit={handleRegister} className="flex gap-2 px-4 py-3">
          <Input
            type="text"
            aria-label={t("domainLabel")}
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="go.example.com"
            disabled={busy}
            required
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="outline" className="h-11" disabled={busy || !domain.trim()}>
            {busy ? t("registering") : t("register")}
          </Button>
        </form>

        {loadFailed ? (
          <ErrorRow
            message={t("loadError")}
            retryLabel={t("retry")}
            onRetry={() => {
              setLoadFailed(false);
              void refresh();
            }}
          />
        ) : items === null ? (
          <NoteRow>{t("loading")}</NoteRow>
        ) : items.length === 0 ? (
          <NoteRow>{t("empty")}</NoteRow>
        ) : (
          items.map((d) => <DomainRow key={d.id} d={d} onVerify={handleVerify} onDelete={handleDelete} t={t} />)
        )}
      </GroupedList>
      {confirmDialog}
    </>
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
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3">
        <code className="min-w-0 break-all font-mono text-sm font-medium text-slate-900 dark:text-slate-100">{d.domain}</code>
        <StatusPill verified={d.verified} inAutoWindow={inAutoWindow} remainingMs={remainingMs} t={t} />
        <div className="ml-auto flex items-center gap-1">
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
            className="text-slate-400 hover:text-red-600 dark:text-slate-400"
            onClick={() => onDelete(d.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!d.verified && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <DnsRecord type="TXT" host={d.verificationHost} value={d.verificationToken} hint={t("dnsTxtHint")} t={t} />
          <DnsRecord type="CNAME" host={d.domain} value="kurl.me" hint={t("dnsCnameHint")} t={t} />
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
      <StatusBadge tone="live">{t("statusVerified")}</StatusBadge>
    );
  }
  if (inAutoWindow) {
    return (
      <StatusBadge tone="neutral">
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        {t("statusAutoChecking", { time: formatRemaining(remainingMs) })}
      </StatusBadge>
    );
  }
  return (
    <StatusBadge tone="caution">{t("statusPending")}</StatusBadge>
  );
}

function DnsRecord({
  type,
  host,
  value,
  hint,
  t,
}: {
  type: "TXT" | "CNAME";
  host: string;
  value: string;
  hint: string;
  t: ReturnType<typeof useTranslations<"settings.customDomains">>;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white font-mono text-[11px] dark:border-slate-800 dark:bg-slate-900 sm:flex sm:items-stretch">
        <span className="flex items-center bg-slate-100 px-2 py-1 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{type}</span>
        <CopyCell name={t("dnsHost")} label={host} />
        <CopyCell name={t("dnsValue")} label={value} />
      </div>
    </div>
  );
}

function CopyCell({ name, label }: { name: string; label: string }) {
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
      className="group flex w-full min-w-0 items-center justify-between gap-2 border-t border-slate-200 px-2 py-1.5 text-left text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/50 sm:w-auto sm:flex-1 sm:basis-0 sm:border-l sm:border-t-0"
    >
      <span className="min-w-0">
        <span className="mr-1.5 font-sans text-slate-400 dark:text-slate-500">{name}</span>{" "}
        <span className="break-all">{label}</span>
      </span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-slate-900 dark:text-slate-100" />
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
