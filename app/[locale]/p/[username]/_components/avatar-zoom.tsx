"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { usePresence } from "@/hooks/use-presence";
import { Avatar } from "@/modules/blog/components/avatar";

export function AvatarZoom({ src, name }: { src: string | null; name: string }) {
  const t = useTranslations("publicPost");
  const [open, setOpen] = useState(false);
  if (!src) return <Avatar src={null} name={name} size="xl" eager />;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("viewAvatar")}
        className="focus-ring shrink-0 rounded-full transition-opacity hover:opacity-90"
      >
        <Avatar src={src} name={name} size="xl" eager />
      </button>
      <AvatarViewer src={src} name={name} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function AvatarViewer({
  src,
  name,
  open,
  onClose,
}: {
  src: string;
  name: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("publicPost");
  const tGallery = useTranslations("publicProfile.gallery");
  const panel = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const { mounted: present, closing } = usePresence(open, 160);

  useEffect(() => setMounted(true), []);
  useFocusTrap(panel, { active: open, onEscape: onClose });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!present || !mounted) return null;
  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label={t("viewAvatar")}
      aria-hidden={closing || undefined}
      className={cn("fixed inset-0 z-50 grid place-items-center p-6", closing && "pointer-events-none")}
    >
      <div
        aria-hidden
        onClick={onClose}
        className={cn("fixed inset-0 bg-slate-950/80 backdrop-blur-sm", closing ? "animate-fade-out" : "animate-fade-in")}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        className={cn(
          "relative aspect-square w-[min(80vw,360px)] rounded-full object-cover shadow-modal",
          closing ? "animate-fade-out" : "animate-fade-in",
        )}
      />
      <button
        type="button"
        onClick={onClose}
        aria-label={tGallery("close")}
        className="focus-ring fixed right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
    </div>,
    document.body,
  );
}
