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
    <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-accent-700 dark:text-accent-500">{t("title")}</h2>
      <p className="mt-1 text-[12px] leading-snug text-slate-500 dark:text-slate-400">
        {t("subtitle")}
      </p>

      <ul className="mt-3 flex flex-col divide-y divide-slate-100 dark:divide-slate-800/60">
        {event.links.map((link) => (
          <li
            key={link.linkId}
            className="flex items-center gap-2 py-2.5"
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
                <LabeledButton onClick={() => copy(link.shortCode!)}>
                  {copiedCode === link.shortCode ? (
                    <Check className="h-3.5 w-3.5 text-accent-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedCode === link.shortCode ? t("copied") : t("copy")}
                </LabeledButton>
                <LabeledButton onClick={() => downloadQr(link)}>
                  <Download className="h-3.5 w-3.5" />
                  {t("qr")}
                </LabeledButton>
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
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-500 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
        >
          <Plus className="h-4 w-4" />
          {t("addAlias")}
        </button>
      </form>
    </section>
  );
}

function LabeledButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[12px] font-medium text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}
