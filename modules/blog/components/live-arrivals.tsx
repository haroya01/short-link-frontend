"use client";

import { useEffect, useState, type HTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";
import { blogCta } from "@/modules/blog/components/blog-cta";

export function LiveLine({
  count,
  label,
  onShow,
  announce,
}: {
  count: number;
  label: string;
  onShow: () => void;
  announce: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-14 z-20 overflow-hidden">
      <span className="sr-only">{announce}</span>
      {count > 0 && (
        <div className="live-line glass-chrome pointer-events-auto flex justify-center border-b border-slate-200/60 px-4 py-2.5 dark:border-slate-800/60">
          <button type="button" onClick={onShow} data-testid="live-line" className={blogCta({ variant: "text" })}>
            {label}
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}

type LiveRowProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  arriving: boolean;
  wash?: boolean;
  as?: "div" | "li";
  children: ReactNode;
};

export function LiveRow({ arriving, wash = false, as: Tag = "div", className, children, ...rest }: LiveRowProps) {
  const [opening, setOpening] = useState(() => arriving && !prefersReducedMotion());
  return (
    <Tag
      {...rest}
      className={cn(className, opening && "live-open")}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setOpening(false);
      }}
    >
      <div className={wash ? "live-wash" : undefined}>{children}</div>
    </Tag>
  );
}
