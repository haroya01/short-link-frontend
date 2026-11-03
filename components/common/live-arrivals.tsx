"use client";

import { useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";

export function LivePill({
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
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[4.25rem] z-30 flex justify-center px-4">
      <span className="sr-only">{announce}</span>
      {count > 0 && (
        <button
          type="button"
          onClick={onShow}
          data-testid="live-pill"
          className="live-pill focus-ring pointer-events-auto rounded-full bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white shadow-float hover:bg-slate-800"
        >
          {label}
        </button>
      )}
    </div>
  );
}

type LiveRowProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  arriving: boolean;
  as?: "div" | "li";
  children: ReactNode;
};

export function LiveRow({ arriving, as: Tag = "div", className, children, ...rest }: LiveRowProps) {
  const [opening, setOpening] = useState(() => arriving && !prefersReducedMotion());
  return (
    <Tag
      {...rest}
      className={cn(className, opening && "live-open")}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setOpening(false);
      }}
    >
      <div>{children}</div>
    </Tag>
  );
}
