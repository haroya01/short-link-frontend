"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Download, Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import type { EventLink, MyEvent } from "@/modules/events/api/events";
import { createAliasLink } from "@/modules/events/api/events";
import { shortUrlOf } from "@/modules/events/lib/format";

/**
 * 배포 도구 — 채널별 별칭 링크가 곧 유입 분석의 축. "단톡용 링크는 단톡에만" 이 지켜질수록
 * 대시보드의 채널 분해가 정확해진다.
 */
export function SharePanel({ event, onLinksChange }: { event: MyEvent; onLinksChange: () => void }) {
  const t = useTranslations("events.share");
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(shortUrlOf(code));
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const downloadQr = async (link: EventLink) => {
    if (!link.shortCode) return;
    const QRCode = (await import("qrcode")).default;
    // ?src=qr — 스캔 유입이 클릭 분석에서 'qr' 채널로 갈린다 (기존 규약).
    const url = await QRCode.toDataURL(`${shortUrlOf(link.shortCode)}?src=qr`, {
      width: 512,
      margin: 2,
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `kurl-event-${event.slug}-${link.label}.png`;
    a.click();
  };

  const addAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || busy) return;
    setBusy(true);
    try {
      await createAliasLink(event.id, label.trim());
      setLabel("");
      onLinksChange();
      toast(t("aliasCreated"), "success");
    } catch {
      toast(t("aliasFailed"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">{t("title")}</h2>
      <p className="mt-1 text-[12px] leading-snug text-slate-500 dark:text-slate-400">
        {t("subtitle")}
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {event.links.map((link) => (
          <li
            key={link.linkId}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {link.label}
              </span>
              <span className="block truncate font-mono text-[13px] text-slate-800 dark:text-slate-200">
                {link.shortCode ? shortUrlOf(link.shortCode).replace(/^https?:\/\//, "") : "—"}
              </span>
            </span>
            {link.shortCode ? (
              <>
                <IconButton
                  label={t("copy")}
                  onClick={() => copy(link.shortCode!)}
                >
                  {copiedCode === link.shortCode ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </IconButton>
                <IconButton label={t("downloadQr")} onClick={() => downloadQr(link)}>
                  <Download className="h-4 w-4" />
                </IconButton>
              </>
            ) : null}
          </li>
        ))}
      </ul>

      <form onSubmit={addAlias} className="mt-3 flex items-center gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={50}
          placeholder={t("aliasPlaceholder")}
          aria-label={t("aliasLabel")}
        />
        <button
          type="submit"
          disabled={busy || !label.trim()}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-500 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
        >
          <Plus className="h-4 w-4" />
          {t("addAlias")}
        </button>
      </form>
    </section>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}
