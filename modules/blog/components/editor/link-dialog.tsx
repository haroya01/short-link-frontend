"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Clipboard } from "lucide-react";
import { BottomSheet } from "@/components/common/bottom-sheet";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useNarrowViewport } from "@/hooks/use-narrow-viewport";
import { shortenUrl } from "@/lib/api/links";
import { cn } from "@/lib/utils";
import { LinkCardBody } from "@/modules/blog/components/editor/link-card-node";
import { isVideoUrl, normalizeAddress, pastedUrl } from "@/modules/blog/lib/link-paste";

export type LinkDialogResult = { mode: "link" | "card"; text: string; href: string };

export type LinkDialogRequest = {
  mode: "link" | "card";
  text: string;
  href: string;
  /** A card replaces the whole line, so it's offered only where nothing is selected or being edited. */
  canPickCard: boolean;
  editing: boolean;
  anchor: { left: number; top: number; bottom: number } | null;
};

async function clipboardUrl(): Promise<string | null> {
  try {
    const permission = await navigator.permissions?.query({ name: "clipboard-read" as PermissionName });
    if (permission?.state !== "granted") return null;
    return pastedUrl(await navigator.clipboard.readText());
  } catch {
    return null;
  }
}

function LinkForm({
  request,
  onCancel,
  onSubmit,
}: {
  request: LinkDialogRequest;
  onCancel: () => void;
  onSubmit: (result: LinkDialogResult) => void;
}) {
  const t = useTranslations("postEditor.linkSheet");
  const [mode, setMode] = useState(request.mode);
  const [text, setText] = useState(request.text);
  const [href, setHref] = useState(request.href);
  const [fromClipboard, setFromClipboard] = useState<string | null>(null);
  const [shorten, setShorten] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const url = pastedUrl(normalizeAddress(href));
  const [preview, setPreview] = useState<"loading" | "ready" | "failed">("loading");
  const video = url ? isVideoUrl(url) : false;
  const hintId = useId();
  const showHint = !!fromClipboard && href === fromClipboard;

  useEffect(() => {
    if (request.href) return;
    let live = true;
    void clipboardUrl().then((found) => {
      if (!live || !found) return;
      setHref((current) => current || found);
      setFromClipboard(found);
    });
    return () => {
      live = false;
    };
  }, [request.href]);

  async function submit() {
    if (!url || busy) return;
    let target = url;
    if (mode === "link" && shorten) {
      setBusy(true);
      try {
        target = (await shortenUrl({ url })).shortUrl;
      } catch {
        toast(t("shortenFailed"), "error");
      }
    }
    onSubmit({ mode, text: text.trim(), href: target });
  }

  const field =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-accent-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-accent-500";
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-3"
    >
      {request.canPickCard && (
        <div role="radiogroup" aria-label={t("kind")} className="grid grid-cols-2 rounded-lg bg-slate-100 p-0.5 text-[13px] font-medium dark:bg-slate-800">
          {(["link", "card"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={mode === kind}
              onClick={() => setMode(kind)}
              className={cn(
                "focus-ring rounded-md py-1.5 transition-colors",
                mode === kind
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              {kind === "link" ? t("asLink") : video ? t("asVideo") : t("asCard")}
            </button>
          ))}
        </div>
      )}
      {mode === "link" && (
        <label className="flex flex-col gap-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">
          {t("textLabel")}
          <input
            type="text"
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onEnter}
            placeholder={t("textPlaceholder")}
            className={field}
          />
        </label>
      )}
      <div className="flex flex-col gap-1">
        <label className="flex flex-col gap-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">
          {t("addressLabel")}
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            autoFocus={!request.text || mode === "card"}
            value={href}
            onChange={(e) => setHref(e.target.value)}
            onKeyDown={onEnter}
            placeholder="https://…"
            aria-describedby={showHint ? hintId : undefined}
            className={field}
          />
        </label>
        {showHint && (
          <p id={hintId} data-clipboard-hint className="flex items-center gap-1 text-[12px] text-accent-700 dark:text-accent-400">
            <Clipboard aria-hidden className="h-3 w-3" />
            {t("fromClipboard")}
          </p>
        )}
      </div>
      {mode === "card" && url && (
        <div className="flex flex-col gap-1.5">
          <div data-link-preview className="max-h-56 overflow-hidden">
            <LinkCardBody url={url} onPreview={setPreview} />
          </div>
          {preview !== "ready" && (
            <p role="status" className="text-[12px] text-slate-500 dark:text-slate-400">
              {preview === "loading" ? t("previewLoading") : t("previewFailed")}
            </p>
          )}
        </div>
      )}
      {mode === "link" && (
        <label className="flex items-center justify-between gap-3 text-[13px] text-slate-700 dark:text-slate-200">
          <span className="flex flex-col">
            {t("shorten")}
            <span className="text-[12px] text-slate-500 dark:text-slate-400">{t("shortenHint")}</span>
          </span>
          <Switch checked={shorten} onCheckedChange={setShorten} aria-label={t("shorten")} />
        </label>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={!url || busy}
          className="rounded-lg bg-accent-700 px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-800 disabled:opacity-40"
        >
          {request.editing ? t("update") : t("insert")}
        </button>
      </div>
    </form>
  );
}

function Popover({
  anchor,
  label,
  onClose,
  children,
}: {
  anchor: LinkDialogRequest["anchor"];
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  useFocusTrap(ref, { active: true, onEscape: onClose });

  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const { width, height } = panel.getBoundingClientRect();
    const gap = 8;
    const at = anchor ?? { left: (window.innerWidth - width) / 2, top: window.innerHeight * 0.18, bottom: window.innerHeight * 0.18 };
    const below = at.bottom + gap;
    const top = below + height <= window.innerHeight - 16 ? below : Math.max(16, at.top - gap - height);
    const left = Math.min(Math.max(16, at.left - 16), window.innerWidth - width - 16);
    setPlace({ left, top });
  }, [anchor]);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      style={place ?? { visibility: "hidden" }}
      className="fixed z-[60] w-[min(26rem,calc(100vw-2rem))] animate-fade-in rounded-2xl border border-slate-200 bg-white p-4 shadow-modal motion-reduce:animate-none dark:border-slate-700 dark:bg-slate-850"
    >
      <p className="mb-3 text-[13px] font-semibold text-slate-700 dark:text-slate-200">{label}</p>
      {children}
    </div>,
    document.body,
  );
}

export function LinkDialog({
  request,
  onClose,
  onSubmit,
}: {
  request: LinkDialogRequest | null;
  onClose: () => void;
  onSubmit: (result: LinkDialogResult) => void;
}) {
  const t = useTranslations("postEditor.linkSheet");
  const narrow = useNarrowViewport();
  const [shown, setShown] = useState<LinkDialogRequest | null>(request);
  useEffect(() => {
    if (request) setShown(request);
  }, [request]);

  const label = shown?.editing ? t("editTitle") : t("title");
  const form = shown && (
    <LinkForm
      key={`${shown.mode}:${shown.href}:${shown.text}`}
      request={shown}
      onCancel={onClose}
      onSubmit={(result) => {
        onSubmit(result);
        onClose();
      }}
    />
  );

  if (narrow) {
    return (
      <BottomSheet open={!!request} onClose={onClose} label={label}>
        <p className="mb-3 text-[15px] font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        {form}
      </BottomSheet>
    );
  }
  if (!request || !shown) return null;
  return (
    <Popover anchor={shown.anchor} label={label} onClose={onClose}>
      {form}
    </Popover>
  );
}
