"use client";

import { useEffect, useId, useState } from "react";
import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { createRoomInvite, roomShareUrl, type RoomInvite } from "@/modules/rooms/api/rooms";
import { PANEL_TEXT_BUTTON, RoomPanel } from "./room-panel";

const LIMITS = [0, 5, 10, 20, 50];
const EXPIRIES = [0, 1, 7];
const FIELD =
  "focus-ring cursor-pointer appearance-none rounded bg-transparent text-right text-[15px] text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white";
const ROW = "flex items-center justify-between gap-3 py-3 text-[15px] text-slate-900 dark:text-slate-100";

export function RoomLinkDialog({
  open,
  roomId,
  roomName,
  invite,
  onChange,
  onClose,
}: {
  open: boolean;
  roomId: number;
  roomName: string;
  invite: RoomInvite;
  onChange: (invite: RoomInvite) => void;
  onClose: () => void;
}) {
  const t = useTranslations("rooms");
  const { toast } = useToast();
  const [qr, setQr] = useState<string | null>(null);
  const [limit, setLimit] = useState(0);
  const [expiry, setExpiry] = useState(0);
  const [approval, setApproval] = useState(false);
  const [making, setMaking] = useState(false);
  const limitId = useId();
  const expiryId = useId();
  const approvalId = useId();
  const url = roomShareUrl(invite);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setQr(null);
    void import("qrcode")
      .then(({ default: QRCode }) => QRCode.toDataURL(url, { width: 480, margin: 1 }))
      .then((data) => live && setQr(data))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [open, url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast(t("linkCopied"));
    } catch {
      toast(t("linkCopyFailed"), "error");
    }
  }

  async function make() {
    setMaking(true);
    try {
      onChange(
        await createRoomInvite(roomId, {
          maxUses: limit === 0 ? null : limit,
          expiresInSeconds: expiry === 0 ? null : expiry * 86_400,
          approval,
        }),
      );
    } catch {
      toast(t("linkFailed"), "error");
    } finally {
      setMaking(false);
    }
  }

  const usage =
    invite.maxUses === null ? t("used", { uses: invite.uses }) : t("usedOf", { uses: invite.uses, max: invite.maxUses });

  return (
    <RoomPanel
      open={open}
      onClose={onClose}
      title={t("linkTitle")}
      subtitle={roomName}
      testId="room-link-dialog"
      layer="z-[60]"
      leading={<span />}
      trailing={
        <button type="button" onClick={onClose} className={PANEL_TEXT_BUTTON}>
          {t("done")}
        </button>
      }
    >
      <div className="flex flex-col items-center gap-3 pt-5">
        <div className="grid h-52 w-52 place-items-center rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700">
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={t("qrLabel")} data-room-qr className="h-full w-full animate-fade-in motion-reduce:animate-none" />
          )}
        </div>
        <p data-room-link-url className="max-w-full select-all truncate text-[13px] text-slate-500 dark:text-slate-400">
          {url}
        </p>
        <button
          type="button"
          onClick={() => void copy()}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-1.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <Link2 aria-hidden className="h-4 w-4" />
          {t("copyLink")}
        </button>
        <p className="text-[12px] text-slate-500 dark:text-slate-400">{t("codeUsage", { code: invite.code, usage })}</p>
      </div>

      <section className="mt-6">
        <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{t("newLink")}</h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <label htmlFor={limitId} className={ROW}>
            {t("uses")}
            <select id={limitId} value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={FIELD}>
              {LIMITS.map((value) => (
                <option key={value} value={value}>
                  {value === 0 ? t("unlimited") : t("times", { count: value })}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor={expiryId} className={ROW}>
            {t("expiry")}
            <select id={expiryId} value={expiry} onChange={(e) => setExpiry(Number(e.target.value))} className={FIELD}>
              {EXPIRIES.map((days) => (
                <option key={days} value={days}>
                  {days === 0 ? t("never") : t("days", { count: days })}
                </option>
              ))}
            </select>
          </label>
          <div className={ROW}>
            <label htmlFor={approvalId}>{t("approvalToggle")}</label>
            <Switch id={approvalId} checked={approval} onCheckedChange={setApproval} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void make()}
          disabled={making}
          data-room-make-link
          className="focus-ring mt-2 w-full rounded-lg border border-slate-200 py-2.5 text-[14px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          {t("makeLink")}
        </button>
      </section>
    </RoomPanel>
  );
}
